// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

// ******************************ARCHITECTURE******************************
//
//   Parsers:            Registry:           Handlers:
//   codeLens.ts ---+--> extension.ts --+--> runInTerminal.ts
//   codeLinks.ts --|                   |--> runOnMarkdown.ts
//
// - `extension.ts`: Activates and deactivates the extension, loads providers
//   from codeLinks and codeLens, and registers their commands and handlers.
//
// - `codeLinks.ts`: Wraps inline `code` spans with clickable "Run in Terminal"
//   DocumentLinks and "Copy to clipboard" hover actions.
//
// - `codeLens.ts`: Adds CodeLens buttons (Run, Copy, Clear, Delete, Stop/Kill)
//   above fenced code blocks (enclosed by 3+ backticks).
//
// - `runInTerminal.ts`: Runs code in the terminal — either line-by-line or by
//   writing to a file and compiling/executing it.
//
// - `runOnMarkdown.ts`: Spawns child processes, streams their output into the
//   document in a ```output block, manages process lifecycle (kill, delete),
//   and tracks active PIDs for stop/kill CodeLens buttons.
//
// ************************************************************************

import * as vscode from "vscode";
import * as fs from "fs";
import {
  InlineCodeLinkProvider,
  InlineCodeHoverProvider,
  inlineRegex,
} from "./codeLinks";
import { ButtonCodeLensProvider, blockRegex, parseBlock } from "./codeLens";
import { runInTerminal, getRunCommand } from "./runInTerminal";
import {
  childProcesses,
  deleteBlock,
  runOnMarkdown,
  killProcess,
  killAllProcesses,
} from "./runOnMarkdown";

// Represents a code block extracted from a document
export interface CodeBlock {
  docUri: vscode.Uri;
  range: vscode.Range;
  lang: string;
  code: string;
  pid: number;
}

// Temp files created for compilation/execution; cleaned up on deactivation.
export const tempFilePaths: string[] = [];

// Retained to call .refresh() when enabledButtons config changes.
export let codeLensProvider: ButtonCodeLensProvider | undefined;

// Tracked disposables (providers) so they can be disposed on re-registration.
let disposables: vscode.Disposable[] = [];

// Find the fenced code block at the cursor position in the active editor.
// Returns null when no editor is active, or no block is found.
function getCurrentBlock() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;
  for (const match of editor.document.getText().matchAll(blockRegex())) {
    const block = parseBlock(editor.document, match);
    if (block.range.contains(editor.selection.active)) return block;
  }
  return null;
}

// Find the inline code span at the cursor position.
// Returns null when no editor is active, or no match is found.
function getCurrentLink() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;
  const cursor = editor.selection.active;
  const range = editor.document.getWordRangeAtPosition(cursor, inlineRegex());
  if (!range) return null;
  const code = editor.document.getText(range).replace(/`/g, "");
  return code ? { code } : null;
}

// Shift a range's start/end lines by a given offset.
const rangeOff = (range: vscode.Range, startOff: number, endOff: number) =>
  new vscode.Range(range.start.line + startOff, 0, range.end.line + endOff, 0);

// Curried helper for clear/delete commands – only the offset differs.
const clearOrDelete =
  (startOff: number, endOff: number) => (parsed?: CodeBlock) => {
    const block = parsed ? parsed : getCurrentBlock();
    if (!block) return;
    const range = rangeOff(block.range, startOff, endOff);
    return deleteBlock(block, range);
  };

// Maps command IDs to their implementations.
const commands = {
  "markdown.runBlock": async (parsed?: CodeBlock) => {
    const block = parsed ? parsed : getCurrentBlock();
    if (!block) return;
    return runInTerminal(await getRunCommand(block));
  },
  "markdown.runInTerminal": (parsed?: CodeBlock) => {
    const block = parsed ? parsed : getCurrentBlock();
    if (block && !["bash", "powershell"].includes(block.lang)) return;
    const link = !block ? getCurrentLink() : null;
    const command = block?.code || link?.code;
    if (!command) return;
    return runInTerminal(command);
  },
  "markdown.runOnMarkdown": async (parsed?: CodeBlock) => {
    const block = parsed ? parsed : getCurrentBlock();
    if (!block) return;
    return runOnMarkdown(block, await getRunCommand(block));
  },
  "markdown.copy": (parsed?: CodeBlock) => {
    const code = parsed?.code ?? getCurrentBlock()?.code ?? getCurrentLink()?.code;
    if (!code) return;
    vscode.env.clipboard.writeText(code);
    vscode.window.setStatusBarMessage("Copied to clipboard!", 2000);
  },
  "markdown.clear": clearOrDelete(1, 0),
  "markdown.delete": clearOrDelete(0, 1),
  "markdown.killProcess": (parsed?: CodeBlock, signal?: string) => {
    const block = parsed ? parsed : getCurrentBlock();
    if (!block) return;
    if (block.pid === -1) {
      const child = childProcesses.find((c) => c.docUri.toString() === block.docUri.toString());
      if (child) block.pid = child.pid;
    }
    return killProcess(block, signal ?? "SIGINT");
  },
  "markdown.killAllProcesses": killAllProcesses,
  "markdown._getProcesses": () => childProcesses,
};

// Register CodeLens, DocumentLink, and Hover providers for all enabled languages.
// Disposes previous instances on re-registration (e.g. on config change).
function registerProviders(context: vscode.ExtensionContext) {
  const selector = [{ language: "markdown", scheme: "file" }];
  const config = vscode.workspace.getConfiguration();
  if (config.get<boolean>("markdownRunner.activateOnQuarto"))
    selector.push({ language: "quarto", scheme: "file" });

  disposables.forEach((disposable) => disposable.dispose());

  codeLensProvider = new ButtonCodeLensProvider();
  const inlineProvider = new InlineCodeLinkProvider();
  const hoverProvider = new InlineCodeHoverProvider();
  disposables = [
    vscode.languages.registerCodeLensProvider(selector, codeLensProvider),
    vscode.languages.registerDocumentLinkProvider(selector, inlineProvider),
    vscode.languages.registerHoverProvider(selector, hoverProvider),
  ];
  context.subscriptions.push(...disposables);
}

// Extension entry point: register providers, listen for config changes, and
// register all commands.
export function activate(context: vscode.ExtensionContext) {
  registerProviders(context);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("markdownRunner.activateOnQuarto"))
        registerProviders(context);
      if (e.affectsConfiguration("markdownRunner.enabledButtons"))
        codeLensProvider?.refresh();
    }),
    ...Object.entries(commands).map(([command, handler]) =>
      vscode.commands.registerCommand(command, handler),
    ),
  );
}

// Clean up temp files on deactivation.
export const deactivate = () => tempFilePaths.forEach(fs.unlinkSync);

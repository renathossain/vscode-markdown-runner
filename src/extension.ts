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
import { InlineCodeLinkProvider, InlineCodeHoverProvider } from "./codeLinks";
import { ButtonCodeLensProvider, blockRegex, parseBlock } from "./codeLens";
import { runInTerminal, getRunCommand } from "./runInTerminal";
import {
  childProcesses,
  deleteOnMarkdown,
  runOnMarkdown,
  killProcess,
  killAllProcesses,
} from "./runOnMarkdown";

// Temp files created for compilation/execution; cleaned up on deactivation.
export const tempFilePaths: string[] = [];

// Retained to call .refresh() when enabledButtons config changes.
export let codeLensProvider: ButtonCodeLensProvider | undefined;

// Tracked disposables (providers) so they can be disposed on re-registration.
let disposables: vscode.Disposable[] = [];

// Find the fenced code block at the cursor position in the active editor.
// Returns null when no block is found or no editor is active.
function getCurrentCodeBlock() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;
  const cursor = editor.selection.active;
  for (const match of editor.document.getText().matchAll(blockRegex())) {
    const { language, code, range } = parseBlock(editor.document, match);
    if (language && range.contains(cursor))
      return { lang: language, code, range };
  }
  return null;
}

// Maps command IDs to their implementations.
const commands = {
  "markdown.runBlock": async (lang?: string, code?: string) => {
    if (!lang || !code) {
      const block = getCurrentCodeBlock();
      if (!block) return;
      lang = block.lang;
      code = block.code;
    }
    return runInTerminal(await getRunCommand(lang, code));
  },
  "markdown.runInTerminal": runInTerminal,
  "markdown.runOnMarkdown": async (
    lang?: string,
    code?: string,
    range?: vscode.Range,
  ) => {
    if (!lang || !code || !range) {
      const block = getCurrentCodeBlock();
      if (!block) return;
      lang = block.lang;
      code = block.code;
      range = block.range;
    }
    return runOnMarkdown(await getRunCommand(lang, code), range);
  },
  "markdown.copy": (code: string) => {
    vscode.env.clipboard.writeText(code);
    vscode.window.setStatusBarMessage("Copied to clipboard!", 2000);
  },
  "markdown.delete": deleteOnMarkdown,
  "markdown.killProcess": killProcess,
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

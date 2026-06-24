// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

// Provides CodeLens buttons (Run, Copy, Clear, Delete, Stop/Kill) for fenced
// code blocks in Markdown documents.

import * as vscode from "vscode";
import { getLanguageConfig } from "./runInTerminal";
import { childProcesses } from "./runOnMarkdown";

// Matches fenced code blocks, with support for leading whitespace (tabs/spaces)
// before both the opening and closing fences. Each group is enclosed within
// brackets e.g. (`{3,}). Group 1 captures the opening fence (3+ backticks) and
// \1 backreferences it to ensure the ending fence matches the opening fence
// length. Group 2 captures the language (e.g. "python"), and Group 3 the code
// body. Flags: g = global, m = ^/$ match line boundaries, s = . matches
// newlines (enabling multi-line body capture).
export const blockRegex = () =>
  /^[ \t]*(\x60{3,})(.*?)\n(.*?)^[ \t]*\1[ \t]*$/gms;

// Extract language, code content, and document range from a block regex match.
// Leading whitespace (indentation) is stripped from each code line to avoid
// sending formatting artifacts to interpreters/compilers.
export function parseBlock(doc: vscode.TextDocument, match: RegExpExecArray) {
  const cleaned = match[2].trim().toLowerCase();
  const lang = cleaned.match(/^[\w+#]+/)?.[0] ?? "";
  const pid = Number(cleaned.match(/pid_(\d+)$/)?.[1] ?? -1);
  const start = doc.positionAt(match.index);
  const end = doc.positionAt(match.index + match[0].length);
  const range = new vscode.Range(start, end);
  const indent = match[0].match(/^[ \t]*/)?.[0] ?? "";
  const code = indent
    ? match[3].replace(/^.*$/gm, (l) =>
        l.startsWith(indent) ? l.slice(indent.length) : l,
      )
    : match[3];
  return { docUri: doc.uri, range, lang, code, pid };
}

// Convenience helper to create and append a CodeLens.
const add = (
  lenses: vscode.CodeLens[],
  range: vscode.Range,
  title: string,
  command: string,
  args: unknown[],
) =>
  lenses.push(new vscode.CodeLens(range, { title, command, arguments: args }));

// Build the full list of CodeLenses for the active document.
async function provideCodeLenses(document: vscode.TextDocument) {
  const lenses: vscode.CodeLens[] = [];
  const buttons = vscode.workspace
    .getConfiguration()
    .get<Record<string, boolean>>("markdownRunner.enabledButtons", {});

  // Buttons for each fenced code block in the document.
  for (const match of document.getText().matchAll(blockRegex())) {
    const block = parseBlock(document, match);
    const args = [block];
    const { docUri, range, lang, pid } = block;

    // Stop/kill buttons for any running child processes.
    for (const child of childProcesses) {
      if (child.pid === pid && child.docUri === docUri) {
        add(lenses, range, "Stop", "markdown.killProcess", [block, "SIGINT"]);
        add(lenses, range, "Kill", "markdown.killProcess", [block, "SIGKILL"]);
      }
    }

    const name = getLanguageConfig(lang, "interpreter")?.name || "";
    if (name && buttons["runBlock"])
      add(lenses, range, `Run ${name} Block`, "markdown.runBlock", args);

    const isShell = lang === "bash" || lang === "powershell";
    if (name && buttons["runInTerminal"] && isShell)
      add(lenses, range, "Run in Terminal", "markdown.runInTerminal", args);

    if (name && buttons["runOnMarkdown"])
      add(lenses, range, "Run on Markdown", "markdown.runOnMarkdown", args);

    // Utility buttons available for every block regardless of language.
    if (buttons["copy"]) add(lenses, range, "Copy", "markdown.copy", args);
    if (buttons["clear"]) add(lenses, range, "Clear", "markdown.clear", args);
    if (buttons["delete"])
      add(lenses, range, "Delete", "markdown.delete", args);
  }

  return lenses;
}

// CodeLens provider overlaying action buttons on fenced code blocks.
export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
  private _emitter = new vscode.EventEmitter<void>();
  onDidChangeCodeLenses = this._emitter.event;
  provideCodeLenses = provideCodeLenses;

  // Force the editor to regenerate lenses (e.g. after a process starts/stops).
  public refresh = () => this._emitter.fire();
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

// Provides CodeLens buttons (Run, Copy, Clear, Delete, Stop/Kill) for fenced
// code blocks in Markdown documents.

import * as vscode from "vscode";
import { getLanguageConfig } from "./runInTerminal";
import { childProcesses } from "./runOnMarkdown";

// Matches fenced code blocks. Each group is enclosed within brackets e.g. (`{3,}).
// Group 1 captures the opening fence (3+ backticks) and \1 backreferences it to
// ensure the ending fence matches the opening fence length. Group 2 captures
// the language (e.g. "python"), and Group 3 the code body. Flags: g = global
// (find all occurrences), m = ^ matches start of line (fence must begin
// at column 0), s = . matches newlines (enabling multi-line body capture).
export const blockRegex = () => /^(`{3,})(.*?)\n(.*?)^\1$/gms;

// Extract language, code content, and document range from a block regex match.
export function parseBlock(doc: vscode.TextDocument, match: RegExpExecArray) {
  const cleaned = match[2].trim().toLowerCase();
  const lang = (cleaned.match(/^[\w+#]+/) ?? [""])[0];
  const start = doc.positionAt(match.index);
  const end = doc.positionAt(match.index + match[0].length);
  return { lang, code: match[3], range: new vscode.Range(start, end) };
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
function provideCodeLenses(document: vscode.TextDocument) {
  const lenses: vscode.CodeLens[] = [];
  const enabledButtons = vscode.workspace
    .getConfiguration()
    .get<Record<string, boolean>>("markdownRunner.enabledButtons", {});

  // Stop/kill buttons for any running child processes.
  for (const { pid, line } of childProcesses) {
    const range = new vscode.Range(line, 0, line, 0);
    add(lenses, range, "Stop", "markdown.killProcess", [pid, "SIGINT"]);
    add(lenses, range, "Kill", "markdown.killProcess", [pid, "SIGKILL"]);
  }

  // Buttons for each fenced code block in the document.
  for (const match of document.getText().matchAll(blockRegex())) {
    const { lang, code, range } = parseBlock(document, match);
    const name = getLanguageConfig(lang, "interpreter")?.name || "";

    if (name) {
      const argsRun = [lang, code];
      if (enabledButtons["runBlock"])
        add(lenses, range, `Run ${name} Block`, "markdown.runBlock", argsRun);

      if (
        enabledButtons["runInTerminal"] &&
        (lang === "bash" || lang === "powershell")
      )
        add(lenses, range, "Run in Terminal", "markdown.runInTerminal", [code]);

      const argsMark = [lang, code, range];
      const cmdMark = "markdown.runOnMarkdown";
      if (enabledButtons["runOnMarkdown"])
        add(lenses, range, "Run on Markdown", cmdMark, argsMark);
    }

    // Utility buttons available for every block regardless of language.
    const clear = new vscode.Range(range.start.line + 1, 0, range.end.line, 0);
    const del = new vscode.Range(range.start.line, 0, range.end.line + 1, 0);
    if (enabledButtons["copy"])
      add(lenses, range, "Copy", "markdown.copy", [code]);
    if (enabledButtons["clear"])
      add(lenses, range, "Clear", "markdown.delete", [clear]);
    if (enabledButtons["delete"])
      add(lenses, range, "Delete", "markdown.delete", [del]);
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

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

// Provides CodeLens buttons (Run, Copy, Clear, Delete, Stop/Kill) for fenced
// code blocks in Markdown documents.

import * as vscode from "vscode";
import { getLanguageConfig } from "./runInTerminal";
import { childProcesses } from "./runOnMarkdown";

// Represents a code block extracted from a document
export interface CodeBlock {
  docUri: vscode.Uri;
  range: vscode.Range;
  lang: string;
  code: string;
  pid: number;
}

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

// CodeLens provider overlaying action buttons on fenced code blocks.
export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
  readonly blocks = new Map<string, CodeBlock[]>();

  private _emitter = new vscode.EventEmitter<void>();
  onDidChangeCodeLenses = this._emitter.event;

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const uri = document.uri.toString();
    if (!this.blocks.has(uri))
      this.blocks.set(uri, this._parseDocument(document));
    return this._buildLenses(document.uri, this.blocks.get(uri)!);
  }

  handleDocumentChange(doc: vscode.TextDocument): void {
    this.blocks.set(doc.uri.toString(), this._parseDocument(doc));
    this._emitter.fire();
  }

  handleDocumentClose(uri: vscode.Uri): void {
    this.blocks.delete(uri.toString());
  }

  // Force the editor to regenerate lenses (e.g. after a process starts/stops).
  refresh(): void {
    this._emitter.fire();
  }

  private _parseDocument(doc: vscode.TextDocument): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    for (const match of doc.getText().matchAll(blockRegex()))
      blocks.push(parseBlock(doc, match));
    return blocks;
  }

  private _buildLenses(docUri: vscode.Uri, blocks: CodeBlock[]) {
    const lenses: vscode.CodeLens[] = [];
    const buttons = vscode.workspace
      .getConfiguration()
      .get<Record<string, boolean>>("markdownRunner.enabledButtons", {});

    for (const block of blocks) {
      const args = [block];
      const { range, lang, pid } = block;

      for (const child of childProcesses) {
        if (
          child.pid === pid &&
          child.docUri.toString() === docUri.toString()
        ) {
          add(lenses, range, "Stop", "markdown.killProcess", [block, "SIGINT"]);
          add(lenses, range, "Kill", "markdown.killProcess", [
            block,
            "SIGKILL",
          ]);
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

      if (buttons["copy"]) add(lenses, range, "Copy", "markdown.copy", args);
      if (buttons["clear"]) add(lenses, range, "Clear", "markdown.clear", args);
      if (buttons["delete"])
        add(lenses, range, "Delete", "markdown.delete", args);
    }

    return lenses;
  }
}

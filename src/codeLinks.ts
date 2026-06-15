// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

// Provides clickable links and hover actions for inline code spans (`code`).

import * as vscode from "vscode";
import { blockRegex } from "./codeLens";

// Matches inline code spans in the format `code`. Lookbehind (?<!`+) and
// lookahead (?!`+) prevent matching inside longer backtick sequences
// (e.g. ``` ``inner`` ```). Group 1 ([^`\n]+?) captures the code content.
// [^`\n]+ matches one or more characters that are neither a backtick nor
// a newline, so the code cannot contain inner backticks or span multiple lines.
// Flags: g = global (find all occurrences).
const inlineRegex = () => /(?<!`+)`([^`\n]+?)`(?!`+)/g;

// Adds a clickable DocumentLink to each inline code span that runs the code
// in the terminal when clicked.
export class InlineCodeLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(document: vscode.TextDocument) {
    return [...document.getText().matchAll(inlineRegex())]
      .filter(
        ({ index }) =>
          ![...document.getText().matchAll(blockRegex())]
            .map(({ index, 0: { length } }) => [index, index + length])
            .some((fence) => index >= fence[0] && index < fence[1]),
      )
      .map((match) => {
        const start = document.positionAt(match.index);
        const end = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(start, end);
        const codeString = encodeURIComponent(JSON.stringify([match[1]]));
        const command = `command:markdown.runInTerminal?${codeString}`;
        return new vscode.DocumentLink(range, vscode.Uri.parse(command));
      });
  }
}

// Adds a hover action to each inline code span that copies the code to the
// clipboard.
export class InlineCodeHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position) {
    const offset = document.offsetAt(position);
    for (const match of document.getText().matchAll(blockRegex()))
      if (offset >= match.index && offset < match.index + match[0].length)
        return;
    const range = document.getWordRangeAtPosition(position, inlineRegex());
    if (!range) return;
    const code = document.getText(range).replace(/`/g, "");
    const contents = new vscode.MarkdownString(
      `[Copy to clipboard](command:markdown.copy?${encodeURIComponent(JSON.stringify([code]))})`,
    );
    return ((contents.isTrusted = true), new vscode.Hover(contents, range));
  }
}

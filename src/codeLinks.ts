// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

import * as vscode from "vscode";

// Explanation of regex:
// [^`\n] means match all any character that is not ` or \n (negated class)
// ([^`\n]+?) capturing group will then match one or more of that class
// It will also do so lazily, instead of greedily because of the ?
// Thus, `([^`\n]+?)` effectively matches an inline code block, with the
// capturing group matching the code itself (non ` or \n characters)
// Finally, we add some extra validation using look ahead and look behind:
// (?<!`+) means negative look behind of at least one `
// (?!`+) means negative look ahead of at least one `
// This means that if there are multiple consecutive ` before and/or after
// the code block, then we reject it.
const inlineRegex = () => /(?<!`+)`([^`\n]+?)`(?!`+)/g;

// DocumentLink Provider for inline code
export class InlineCodeLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(document: vscode.TextDocument) {
    return [...document.getText().matchAll(inlineRegex())].map((match) => {
      // Parse inline code (code within ` delimiters)
      const code = match[1]; // First capturing group ([^`\n]+?)
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(start, end);

      // Generate Document Links that run code with Ctrl+click
      const codeString = encodeURIComponent(JSON.stringify([code]));
      const command = `command:markdown.runInTerminal?${codeString}`;
      return new vscode.DocumentLink(range, vscode.Uri.parse(command));
    });
  }
}

// Creates hover tooltip to copy inline code
export class InlineCodeHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position) {
    const range = document.getWordRangeAtPosition(position, inlineRegex());
    if (!range) return;
    const code = document.getText(range).replace(/`/g, "");
    const codeString = encodeURIComponent(JSON.stringify([code]));
    const command = `[Copy to clipboard](command:markdown.copy?${codeString})`;
    const contents = new vscode.MarkdownString(command);
    contents.isTrusted = true;
    return new vscode.Hover(contents, range);
  }
}

// vscode-markdown-runner
// Copyright (C) 2025 Renat Hossain

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

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
const inlineRegex: RegExp = /(?<!`+)`([^`\n]+?)`(?!`+)/g;

// Parses inline code (code within ` delimiters)
// This is a generator function that yields code and its range
export function* parseInlineCode(
  document: vscode.TextDocument
): Generator<{ code: string; range: vscode.Range }> {
  let match;
  const regex = new RegExp(inlineRegex.source, inlineRegex.flags);
  while ((match = regex.exec(document.getText())) !== null) {
    const code = match[1]; // First capturing group ([^`\n]+?)
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);
    const range = new vscode.Range(start, end);
    yield { code, range };
  }
}

// DocumentLink Provider for inline code
export class InlineCodeLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const inlineCodeLinks: vscode.DocumentLink[] = [];

    // Generate Document Links that run code with Ctrl+click
    for (const { code, range } of parseInlineCode(document)) {
      const codeString = encodeURIComponent(JSON.stringify([code]));
      const command = `command:markdown.runInTerminal?${codeString}`;
      const link = new vscode.DocumentLink(range, vscode.Uri.parse(command));
      inlineCodeLinks.push(link);
    }

    return inlineCodeLinks;
  }
}

// Creates hover tooltip to copy inline code
export class InlineCodeHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const regex = new RegExp(inlineRegex.source, inlineRegex.flags);
    const range = document.getWordRangeAtPosition(position, regex);
    if (!range) return;
    const code = document.getText(range).replace(/`/g, "");
    const codeString = encodeURIComponent(JSON.stringify([code]));
    const command = `[Copy to clipboard](command:markdown.copy?${codeString})`;
    const contents = new vscode.MarkdownString(command);
    contents.isTrusted = true;
    return new vscode.Hover(contents, range);
  }
}

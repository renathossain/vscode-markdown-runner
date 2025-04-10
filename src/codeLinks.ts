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

// Parses inline code (code within ` delimiters)
// This is a generator function that yields code and its location
export function* parseInlineCode(
  document: vscode.TextDocument
): Generator<{ code: string; location: vscode.Range }> {
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
  const regex: RegExp = /(?<!`+)`([^`\n]+?)`(?!`+)/g;

  // Loop through all matches and yield them
  let match;
  while ((match = regex.exec(document.getText())) !== null) {
    // match[0] captures the entire code block (we do not need it)
    const code = match[1]; // First capturing group ([^`\n]+?)
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    const location = new vscode.Range(startPos, endPos);
    yield { code, location };
  }
}

// DocumentLink Provider for inline code
export class InlineCodeLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const inlineCodeLinks: vscode.DocumentLink[] = [];

    // For each parsed inline code, generate a Document Link
    for (const { code, location } of parseInlineCode(document)) {
      const codeString = encodeURIComponent(JSON.stringify([code]));
      const command = `command:markdown.runInTerminal?${codeString}`;
      const link = new vscode.DocumentLink(location, vscode.Uri.parse(command));
      inlineCodeLinks.push(link);
    }

    return inlineCodeLinks;
  }
}

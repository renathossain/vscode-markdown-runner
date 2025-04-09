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
import { parseInlineCode } from "./parser";

// DocumentLink Provider for inline code snippets
export class CodeSnippetLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const codeSnippetLinks: vscode.DocumentLink[] = [];

    // For each parsed inline code snippet, generate a Document Link
    for (const { code, range } of parseInlineCode(document)) {
      const codeString = encodeURIComponent(JSON.stringify([code]));
      const command = `command:markdown.runInTerminal?${codeString}`;
      const link = new vscode.DocumentLink(range, vscode.Uri.parse(command));
      codeSnippetLinks.push(link);
    }

    return codeSnippetLinks;
  }
}

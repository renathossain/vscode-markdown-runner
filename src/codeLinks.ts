// vscode-markdown-runner
// Copyright (C) 2024 Renat Hossain

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

import * as vscode from 'vscode';
import { parseInlineCode } from './parser';

// For each parsed inline code snippet, provide a document link that:
// - Runs the code in the terminal
export class CodeSnippetLinkProvider implements vscode.DocumentLinkProvider {
    provideDocumentLinks(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
        const codeSnippetLinks: vscode.ProviderResult<vscode.DocumentLink[]> = [];

        // Loop through all parsed inline code snippets and generate the Document Links
        for (const { code, range } of parseInlineCode(document)) {
            const link = new vscode.DocumentLink(range, vscode.Uri.parse('command:markdown.run.inline'));
            codeSnippetLinks.push(link);
        }

        return codeSnippetLinks;
    }
}

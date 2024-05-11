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
import { parseCodeBlocks } from './parser';
import { getLanguageConfig } from './compilerConfig';

// For each parsed code block, provide a code lens button with the correct title and command:
// - Run the code, if the language is supported
// - Run Terminal commands or Bash file line by line
// - Copy the code
export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        // Loop through all parsed code blocks and generate buttons
        for (const { language, code, range } of parseCodeBlocks(document)) {
            // Check that parsed langauge is valid before creating code lens
            if (getLanguageConfig(language, 'name') !== undefined) {
                pushCodeLens(codeLenses, language, code, range);
            }
            // For bash and untyped code blocks, give `run in terminal` (line by line) option
            if (language === 'bash' || language === '') {
                pushCodeLens(codeLenses, '', code, range);
            }
            // Always provide button to copy code
            pushCodeLens(codeLenses, 'copy', code, range);
        }

        return codeLenses;
    }
}

// Generate the code lens with the required parameters and push it to the list
function pushCodeLens(codeLenses: vscode.CodeLens[], language: string, code: string, range: vscode.Range) {
    const vscodeCommand: vscode.Command = {
        title: provideTitle(language),
        command: provideCommand(language),
        arguments: [code]
    };
    const codeLens = new vscode.CodeLens(range, vscodeCommand);
    codeLenses.push(codeLens);
}

function provideTitle(language: string): string {
    if (language === 'copy') {
        return 'Copy';
    } else if (language === '') {
        return 'Run in Terminal';
    } else if (getLanguageConfig(language, 'compiled')) {
        return `Compile and Run ${getLanguageConfig(language, 'name')} File`;
    } else {
        return `Run ${getLanguageConfig(language, 'name')} File`;
    }
}

export function provideCommand(language: string): string {
    if (language === 'copy') {
        return 'markdown.copy';
    } else if (language === '') {
        return 'markdown.run.terminal';
    } else {
        return `markdown.run.${language}`;
    }
}

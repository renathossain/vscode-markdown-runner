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

// Supported features for a code block
export enum Action {
    RUN_TEMPORARY_FILE,
    RUN_IN_TERMINAL,
    RUN_ON_MARKDOWN_FILE,
    STOP_GLOBAL_RUNNER,
    COPY_CODEBLOCK_CONTENTS
}

// CodeLens buttons provider for parsed code blocks
export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        // Loop through all parsed code blocks and generate buttons
        for (const { language, code, range, endPosition } of parseCodeBlocks(document)) {
            // For all supported languages, provide options to run the code block
            if (getLanguageConfig(language, 'name') !== undefined) {
                pushCodeLens(codeLenses, language, code, range, endPosition, Action.RUN_TEMPORARY_FILE);
                pushCodeLens(codeLenses, language, code, range, endPosition, Action.RUN_ON_MARKDOWN_FILE);
                pushCodeLens(codeLenses, language, code, range, endPosition, Action.STOP_GLOBAL_RUNNER);
            }
            // For bash code blocks, provide `run in terminal (line by line)` option
            if (language === 'bash') {
                pushCodeLens(codeLenses, 'terminal', code, range, endPosition, Action.RUN_IN_TERMINAL);
            }
            // Always provide button to copy code
            pushCodeLens(codeLenses, 'copy', code, range, endPosition, Action.COPY_CODEBLOCK_CONTENTS);
        }

        return codeLenses;
    }
}

// Generate the code lens with the required parameters and push it to the list
function pushCodeLens(codeLenses: vscode.CodeLens[], language: string, code: string, range: vscode.Range, endPosition: vscode.Position, action: Action) {
    const vscodeCommand: vscode.Command = {
        title: provideTitle(language, action),
        command: 'markdown.block',
        arguments: [language, code, endPosition, action]
    };
    const codeLens = new vscode.CodeLens(range, vscodeCommand);
    codeLenses.push(codeLens);
}

// Generate correct title for each button
function provideTitle(language: string, action: Action): string {
    if (action === Action.COPY_CODEBLOCK_CONTENTS) {
        return 'Copy';
    } else if (action === Action.RUN_IN_TERMINAL) {
        return 'Run in Terminal';
    } else if (action === Action.RUN_ON_MARKDOWN_FILE) {
        return `Run on Markdown`;
    } else if (action === Action.STOP_GLOBAL_RUNNER) {
        return `Stop Process`;
    } else if (getLanguageConfig(language, 'compiled')) {
        return `Compile & Run ${getLanguageConfig(language, 'name')} Block`;
    } else {
        return `Run ${getLanguageConfig(language, 'name')} Block`;
    }
}

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

// ******************************ARCHITECTURE******************************
//
//                               extension.ts
//                              /     |      \
//                             /      |       \
//                            /       |        \
//                 codeLens.ts   codeRunner.ts  compilerConfig.ts
//                       |
//                       |
//                   parser.ts
//
// - `extension.ts`: Responsible for activating the extension and orchestrating
//   the loading of language configurations using `compilerConfig.ts`. Passes
//   the configuration to `codeLens.ts` and `codeRunner.ts`.
//
// - `codeLens.ts`: Uses the language configuration to generate appropriate
//   code lens buttons for each code block in the editor. Utilizes `parser.ts`
//   to parse code blocks and determine their language and content.
//
// - `codeRunner.ts`: Uses the language configuration to provide the correct
//   file extension and compiler to execute code blocks.
//
// - `compilerConfig.ts`: Provides language configurations used by `codeLens.ts`
//   and `codeRunner.ts`.
//
// - `parser.ts`: Responsible for parsing code blocks to determine their language
//   and content, assisting `codeLens.ts` in generating code lens buttons.
//
// - Data Flow:
//   - `extension.ts` loads language configurations from `compilerConfig.ts`.
//   - `extension.ts` passes the configurations to `codeLens.ts` and `codeRunner.ts`.
//   - `codeLens.ts` uses configurations to generate code lens buttons,
//     and `parser.ts` assists in parsing the language and code.
//   - `codeRunner.ts` uses language configurations and language and code from
//     code lens to execute code blocks with the correct settings.

import * as vscode from 'vscode';
import { ButtonCodeLensProvider, provideCommand } from './codeLens';
import { getLanguageConfigurations } from './compilerConfig';
import { cleanTempFiles, runCommandsInTerminal, executeJavaBlock, executeCodeBlock } from './codeRunner';
import { CodeSnippetLinkProvider } from './codeLinks';

// Read and store the language configurations as a global variable
export const languageConfigurations = getLanguageConfigurations();

// Create the commands and assign what they do
function registerCommand(context: vscode.ExtensionContext, language: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand(provideCommand(language), async (code: string) => {
            if (language === 'copy') {
                await vscode.env.clipboard.writeText(code);
                vscode.window.showInformationMessage('Code copied to clipboard.');
            } else if (language === '') {
                await runCommandsInTerminal(code);
            } else if (language === 'inline') {
                await runCommandsInTerminal(code);
            } else if (language === 'java') {
                await executeJavaBlock(code);
            } else {
                await executeCodeBlock(language, code);
            }
        })
    );
}

// Main function that runs when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    // Initializes the CodeLens buttons for code blocks
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'markdown', scheme: 'file' },
            new ButtonCodeLensProvider()
        )
    );

    // Initializes the DocumentLinks for inline code (code snippets)
    context.subscriptions.push(
        vscode.languages.registerDocumentLinkProvider({ language: 'markdown', scheme: 'file' },
            new CodeSnippetLinkProvider()
        )
    );

    // Register the commands, which the code lens buttons will activate
    for (const language of Object.keys(languageConfigurations)) {
        registerCommand(context, language);
    }
    registerCommand(context, '');
    registerCommand(context, 'copy');
    registerCommand(context, 'inline');
}

// Deletes the temporary files that were generated during the extension's usage
// when the extension is deactivated or VS Code is closed
export function deactivate() {
    cleanTempFiles();
}

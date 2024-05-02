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
//                             extension.ts
//                                  |
//             +------------+-------+-----+-----------------+       
//             |            |             |                 |
//       codeLinks.ts  codeLens.ts   codeRunner.ts  compilerConfig.ts
//             |            |
//             +-----+------+
//                   |
//               parser.ts
//
// - `extension.ts`: Responsible for activating the extension and orchestrating
//   the loading of the language configuration using `compilerConfig.ts`. Passes
//   the configuration to `codeLens.ts` and `codeRunner.ts`.
//
// - `codeLens.ts`: Uses `parser.ts` to parse code blocks and determine
//   their language and content, then generate appropriate code lens buttons for
//   each code block in the editor. It only generates the buttons for languages
//   specified in the language configuration.
//
// - `codeLinks.ts`: Uses `parser.ts` to parse inline code snippets, then turn them
//   into links that the user can 'Ctrl + Left Click' to run them. 
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
// `compilerConfig.ts` ---> `extension.ts` +-+-> `codeLens.ts` +-+-> codeRunner.ts
//                             `parser.ts` +-+-> `codeLens.ts` +-+
//
// ************************************************************************

import * as vscode from 'vscode';
import { getLanguageConfigurations } from './compilerConfig';
import { ButtonCodeLensProvider, provideCommand } from './codeLens';
import { CodeSnippetLinkProvider } from './codeLinks';
import { cleanTempFiles, runCommandsInTerminal, executeJavaBlock, executeCodeBlock } from './codeRunner';

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

    // Register the commands used by the "subscriptions" above
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

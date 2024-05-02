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

// *********ARCHITECTURE*********
// 

import * as vscode from 'vscode';
import { ButtonCodeLensProvider, provideCommand } from './codeLens';
import { getLanguageConfigurations } from './compilerConfig';
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
    // Initializes the code lens buttons
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'markdown', scheme: 'file' },
            new ButtonCodeLensProvider()
        )
    );

    // Register the commands, which the code lens buttons will activate
    for (const language of Object.keys(languageConfigurations)) {
        registerCommand(context, language);
    }
    registerCommand(context, '');
    registerCommand(context, 'copy');
}

// Deletes the temporary files that were generated during the extension's usage
// when the extension is deactivated or VS Code is closed
export function deactivate() {
    cleanTempFiles();
}
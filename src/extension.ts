// Copyright (c) Renat Hossain. All rights reserved.
// SPDX-License-Identifier: GPL-3.0
// See LICENSE in the project root for license information.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Stores the paths of the temporary files created for running code
const tempFilePaths: string[] = [];

// - Generate the code lens with the required parameters and push it to the list
// - Helper for provideCodeLenses
function createCodeLens(codeLenses: vscode.CodeLens[], document: vscode.TextDocument,
    line: number, title: string, commandString: string, code: string) {
    const range = document.lineAt(line).range;
    const command: vscode.Command = {
        title: title,
        command: commandString,
        arguments: [code]
    };
    const codeLens = new vscode.CodeLens(range, command);
    codeLenses.push(codeLens);
}

// Map the buttons to the corresponding action
const commands: { [key: string]: { title: string, command: string } } = {
    "": {
        title: "Run Line by Line",
        command: "markdown.run.terminal"
    },
    copy: {
        title: "Copy",
        command: "markdown.copy"
    }
};

// - Parses all code blocks -> (line number, code)
// - Render the `Run Code Block` and `Copy` buttons at the correct line number
// - Give each button the correct title and action based on the code block type
export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
    onDidChangeCodeLenses?: vscode.Event<void>;

    provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const codeBlockRegex = /```([\s\S]+?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(document.getText())) !== null) {
            let code = match[1].trim();
            let codeBlockType = match[0].split('\n')[0].trim().toLowerCase().substring(3);
            if (codeBlockType !== "") {
                code = code.replace(/^[^\n]*\n/, ''); // remove code block type
            }
            const line = document.positionAt(match.index).line;
            
            if (codeBlockType === 'bash') {
                createCodeLens(
                    codeLenses, document, line, commands[""].title,
                    commands[""].command, code
                );
            }
            if (commands.hasOwnProperty(codeBlockType)) {
                createCodeLens(
                    codeLenses, document, line, commands[codeBlockType].title,
                    commands[codeBlockType].command, code
                );
            }
            createCodeLens(
                codeLenses, document, line, commands["copy"].title,
                commands["copy"].command, code
            );
        }

        return codeLenses;
    }

    resolveCodeLens?(): vscode.ProviderResult<vscode.CodeLens> {
        return null;
    }
}

// Helper for runCommandsInTerminal
function sendCommandsToTerminal(code: string, terminal: vscode.Terminal) {
    terminal.show();
    terminal.sendText(code);
}

// Run the code line by line the terminal 
export function runCommandsInTerminal(code: string) {
    let disposable = vscode.window.onDidOpenTerminal(terminal => {
        disposable.dispose(); // Stop listening once a terminal is opened
        sendCommandsToTerminal(code, terminal);
    });

    const activeTerminal = vscode.window.activeTerminal;
    if (activeTerminal) {
        // If there's already an active terminal, send commands to it immediately
        sendCommandsToTerminal(code, activeTerminal);
    } else {
        vscode.window.createTerminal(); // Create a terminal if none exists
    }
}

// Java needs very special handling of executing a file
function executeJavaBlock(code: string, extension: string, compiler: string) {
    vscode.window.showInputBox({
        prompt: 'Enter the name of the Java file (without extension). ' +
                'Note: The Java standard requires the filename to be the same as the name of the main class.',
        placeHolder: 'MyJavaFile'
    }).then((javaCompiledName) => {
        if (javaCompiledName) {
            const javaCompiledPath = path.join(os.tmpdir(), javaCompiledName);
            const javaSourcePath = `${javaCompiledPath}.${extension}`;

            fs.writeFileSync(javaSourcePath, code);
            tempFilePaths.push(javaSourcePath);

            runCommandsInTerminal(`${compiler} ${javaSourcePath}`);
            runCommandsInTerminal(`java -cp ${os.tmpdir()} ${javaCompiledName}`);
            tempFilePaths.push(`${javaCompiledPath}.class`);
        }
    });
}

// - Creates a temporary file with a unique name
// - Writes the parsed code to that file
// - Compiles and/or Runs the temporary file
function executeCodeBlock(code: string, extension: string, compiler: string) {
    const compiledName = `temp_${Date.now()}`;
    const compiledPath = path.join(os.tmpdir(), compiledName);
    const sourcePath = `${compiledPath}.${extension}`;

    fs.writeFileSync(sourcePath, code);
    tempFilePaths.push(sourcePath);

    if (extension === 'c' || extension === 'cpp' || extension === 'rs') {
        runCommandsInTerminal(`${compiler} -o ${compiledPath} ${sourcePath}`);
        runCommandsInTerminal(compiledPath);
        tempFilePaths.push(compiledPath);
    } else {
        runCommandsInTerminal(`${compiler} ${sourcePath}`);
    }
}

// Helper for activate function
function registerCommand(context: vscode.ExtensionContext, commandId: string,
    extension?: string, compiler?: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand(commandId, async (code: string) => {
            if (commandId === 'markdown.copy') {
                await vscode.env.clipboard.writeText(code);
                vscode.window.showInformationMessage('Code copied to clipboard.');
            } else if (commandId === 'markdown.run.terminal') {
                await runCommandsInTerminal(code);
            } else if (extension && compiler) {
                if (commandId === 'markdown.run.java') {
                    await executeJavaBlock(code, extension, compiler);
                } else {
                    await executeCodeBlock(code, extension, compiler);
                }
            }
        })
    );
}

// Function to get the compiler configuration for Markdown Python Code Runner
function getLanguageConfigurations(): { [key: string]: {
    name: string, extension: string, compiler: string, compiled: Boolean
}} | undefined {
    const config = vscode.workspace.getConfiguration();
    return config.get<{ [key: string]: {
        name: string, extension: string, compiler: string, compiled: Boolean
    }}>('markdownPythonCodeRunner.compilerConfiguration');
}

// Main function that runs when the extension is activated
// - Initializes and runs the code lens buttons
// - Handles requests for running and copying Markdown Code Blocks
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'markdown', scheme: 'file' },
            new ButtonCodeLensProvider()
        )
    );

    // Read the langauge configuration from settings file
    // and register the commands and buttons
    const languageConfigurations = getLanguageConfigurations();
    if (languageConfigurations) {
        for (const [key, value] of Object.entries(languageConfigurations)) {
            const commandId = `markdown.run.${key}`;
            if (value.compiled) {
                commands[key] = {
                    title: `Compile and Run ${value.name} File`,
                    command: commandId
                };
            } else {
                commands[key] = {
                    title: `Run ${value.name} File`,
                    command: commandId
                };
            }
            registerCommand(context, commandId, value.extension, value.compiler);
        }
    } else {
        vscode.window.showErrorMessage('Language configurations not found.');
    }

    registerCommand(context, 'markdown.run.terminal');
    registerCommand(context, 'markdown.copy');
}

// Deletes the temporary files that were generated during the extension's usage
// when the extension is deactivated or VS Code is closed
export function deactivate() {
    tempFilePaths.forEach(filePath => {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            vscode.window.showErrorMessage(`Error deleting file ${filePath}:`);
        }
    });
}
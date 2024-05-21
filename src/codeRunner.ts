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
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as cp from 'child_process';
import { getLanguageConfig } from './compilerConfig';
import { Action } from './codeLens';

// Stores the paths of the temporary files created for running code
// which are cleaned up at the end
const tempFilePaths: string[] = [];

// Called by `deactivate` to cleanup all temporary files
export function cleanTempFiles() {
    tempFilePaths.forEach(filePath => {
        try { fs.unlinkSync(filePath); }
        catch (error) { vscode.window.showErrorMessage(`Error deleting file ${filePath}:`); }
    });
}

// Create the commands and assign what they do
export function registerCommands(context: vscode.ExtensionContext) {
    const blockFunc = async (language: string, code: string, range: vscode.Range, action: Action) => {
        if (action === Action.COPY_CODEBLOCK_CONTENTS) {
            await vscode.env.clipboard.writeText(code);
            await vscode.window.showInformationMessage('Code copied to clipboard.');
        } else if (action === Action.RUN_IN_TERMINAL) {
            await runInTerminal(code);
        } else if (action === Action.RUN_TEMPORARY_FILE) {
            const command = await getRunCommand(language, code);
            await runInTerminal(command);
        } else if (action === Action.RUN_ON_MARKDOWN_FILE) {
            const command = await getRunCommand(language, code);
            await runOnMarkdown(command);
        }
    };
    const inlineFunc = async (code: string) => {
        await runInTerminal(code);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.block', blockFunc)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.inline', inlineFunc)
    );
}

// For Java code blocks, the user needs to specify a filename
function getBaseName(language: string): Promise<string> {
    if (language === 'java') {
        return new Promise<string>((resolve) => {
            vscode.window.showInputBox({
                prompt: 'Enter the name of the Java file (without extension). ' +
                    'Note: The Java standard requires the filename to be the ' +
                    'same as the name of the main class.',
                placeHolder: 'MyJavaFile'
            }).then((baseName) => { resolve(baseName || ''); });
        });
    } else {
        return Promise.resolve(`temp_${Date.now()}`);
    }
}

// Inject the Python Path Code into Python Files
function injectPythonPath(language: string, code: string): string {
    // Read the Python Path configuration boolean
    const config = vscode.workspace.getConfiguration();
    const pythonPathEnabled = config.get<boolean>('markdownRunner.pythonPath');

    // If the boolean is true, inject the markdown file's path into the code
    const editor = vscode.window.activeTextEditor;
    if (pythonPathEnabled && editor && language === 'python') {
        const documentUri = editor.document.uri;
        const documentDirectory = path.dirname(documentUri.fsPath);
        code = `import sys\nsys.path.insert(0, r'${documentDirectory}')\n` + code;
    }

    return code;
}

// Save code to a temporary file and execute it
// For compiled languages, a child process is created for compilation additionally
// Return command string to be run in terminal or on markdown file as needed
export async function getRunCommand(language: string, code: string): Promise<string> {
    const baseName = await getBaseName(language);
    if (!baseName) { return ''; }
    const extension = getLanguageConfig(language, 'extension');
    const compiler = getLanguageConfig(language, 'compiler');
    code = injectPythonPath(language, code);
    const basePath = path.join(os.tmpdir(), baseName);
    const uncompiledPath = `${basePath}.${extension}`;

    // Write code to a file, SECURITY: Only Owner Read and Write
    fs.writeFileSync(uncompiledPath, code, { mode: 0o600 });
    tempFilePaths.push(uncompiledPath);

    // Compilation for C, C++ and Rust
    if (language === 'c' || language === 'cpp' || language === 'rust') {
        if (await compileHandler(`${compiler} -o ${basePath} ${uncompiledPath}`)) {
            tempFilePaths.push(basePath);
            return basePath;
        }
    }

    // Compilation for Java
    if (language === 'java') {
        if (await compileHandler(`${compiler} ${uncompiledPath}`)) {
            tempFilePaths.push(`${basePath}.class`);
            return `java -cp ${os.tmpdir()} ${baseName}`;
        }
    }

    // If not a compiled language, then run it
    return `${compiler} ${uncompiledPath}`;
}

// If successful compilation, it allows `executeCodeBlock` to execute the file
// Otherwise, it throws an error message
function compileHandler(command: string): Promise<boolean> {
    return new Promise((resolve) => {
        cp.exec(command, (error, stdout, stderr) => {
            if (error) {
                // timeout is necessary because of interference with codelens
                setTimeout(() => {
                    vscode.window.showErrorMessage(stderr, { modal: true });
                }, 100);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// Run command in the terminal
export function runInTerminal(code: string) {
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.show();
    terminal.sendText(code);
}

// Run command on the markdown file
function runOnMarkdown(code: string) {
    const runner = cp.spawn(code, [], { shell: true });
    runner.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    runner.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
}

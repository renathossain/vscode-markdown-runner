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
import treeKill from 'tree-kill';
import AsyncLock from 'async-lock';
import { getLanguageConfig } from './compilerConfig';
import { codeLensChildProcesses } from './codeLens';
import { findResultBlock } from './parser';

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
    const commands: [string, (...args: any[]) => void][] = [
        ['markdown.runFile', async (language: string, code: string) => {
            runInTerminal(await getRunCommand(language, code));
        }],
        ['markdown.runOnMarkdown', async (language: string, code: string, range: vscode.Range) => {
            await runOnMarkdown(await getRunCommand(language, code), range);
        }],
        ['markdown.runInTerminal', runInTerminal],
        ['markdown.copy', (code: string) => {
            vscode.env.clipboard.writeText(code);
            vscode.window.showInformationMessage('Code copied to clipboard.');
        }],
        ['markdown.stopProcess', (pid: number) => treeKill(pid, 'SIGINT')],
        ['markdown.killProcess', (pid: number) => treeKill(pid, 'SIGKILL')]
    ];
  
    commands.forEach(([command, callback]) => {
        context.subscriptions.push(vscode.commands.registerCommand(command, callback));
    });
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
        } else {
            return '';
        }
    }

    // Compilation for Java
    if (language === 'java') {
        if (await compileHandler(`${compiler} ${uncompiledPath}`)) {
            tempFilePaths.push(`${basePath}.class`);
            return `java -cp ${os.tmpdir()} ${baseName}`;
        } else {
            return '';
        }
    }

    // If not a compiled language, then run it
    return `${compiler} ${uncompiledPath}`;
}

// Compiles a binary using the provided command
// Throws an error message if unsucessful
function compileHandler(command: string): Promise<boolean> {
    return new Promise((resolve) => {
        cp.exec(command, (error, stdout, stderr) => {
            if (error) {
                // Timeout is necessary because of interference with codelens
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
    if (code === '') { return; }
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.show();
    terminal.sendText(code);
}

// Run command on the markdown file
async function runOnMarkdown(code: string, range: vscode.Range) {
    // Start child process
    const runner = cp.spawn('sh', ['-c', code], { detached: true });

    // Create Code Lens to stop or kill the process
    let currentPosition = new vscode.Position(range.end.line + 2, 0);
    const childRange = new vscode.Range(currentPosition, currentPosition);
    codeLensChildProcesses.push({ pid: runner.pid!, range: childRange });

    // Output results one line below the process `stop` and `kill` controls
    currentPosition = currentPosition.translate(1, 0);

    // Remove Code Lens once finished with process
    runner.on('close', () => {
        const index = codeLensChildProcesses.findIndex(entry => entry.pid === runner.pid);
        if (index !== -1) {
            codeLensChildProcesses.splice(index, 1);
        }
    });

    // Create lock
    const lock = new AsyncLock();

    // Obtain editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    // Create result block that holds execution results
    const deleteRange = findResultBlock(editor.document, range.end.line + 1);
    if (deleteRange) {
        // If result block found, clear the contents inside it
        await lock.acquire('key', async () => {
            // Critical section code here
            await editor.edit((editBuilder) => {
                editBuilder.delete(deleteRange);
            });
        });
    } else {
        // If result block not found, create it
        insertText(editor, currentPosition, "\n```result\n```\n");
    }

    // Write child process execution results onto markdown file
    runner.stdout.on('data', async (data: Buffer) => {
        // Throttle write attempts
        await lock.acquire('key', async () => {
            // Critical section code here
            const output = data.toString();
            await insertText(editor, currentPosition, output);
            const outputLines = output.split('\n');
            const lastLineLength = outputLines[outputLines.length - 1].length;
            currentPosition = currentPosition.translate(outputLines.length - 1, lastLineLength); 
        });
    });
}

// Helper function to runOnMarkdown
async function insertText(editor: vscode.TextEditor, currentPosition: vscode.Position, insertedText: string) {
    await editor.edit((editBuilder) => {
        editBuilder.insert(currentPosition, insertedText);
    }).then(success => {
        if (success) {
            // Save the document to ensure undoability
            vscode.window.activeTextEditor?.document.save();
        }
    });
}

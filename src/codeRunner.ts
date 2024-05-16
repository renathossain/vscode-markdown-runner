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
import { provideCommand } from './codeLens';

// Stores the paths of the temporary files created for running code
// which are cleaned up at the end
const tempFilePaths: string[] = [];

// Called by `deactivate` to cleanup all temporary files
export function cleanTempFiles() {
    tempFilePaths.forEach(filePath => {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            vscode.window.showErrorMessage(`Error deleting file ${filePath}:`);
        }
    });
}

// Create the commands and assign what they do
export function registerCommand(context: vscode.ExtensionContext, language: string, type: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand(provideCommand(language, type), async (code: string) => {
            if (language === 'copy') {
                await vscode.env.clipboard.writeText(code);
                vscode.window.showInformationMessage('Code copied to clipboard.');
            } else if (language === 'terminal') {
                await runCommand(code, type);
            } else if (language === 'inline') {
                await runCommand(code, type);
            } else if (language === 'java') {
                await executeJavaBlock(code, type);
            } else {
                await executeCodeBlock(language, code, type);
            }
        })
    );
}

// For Java code blocks, special handling is needed
// The user is prompted to enter the name of the Java file to match the name of the main class
export function executeJavaBlock(code: string, type: string) {
    vscode.window.showInputBox({
        prompt: 'Enter the name of the Java file (without extension). ' +
            'Note: The Java standard requires the filename to be the ' +
            'same as the name of the main class.',
        placeHolder: 'MyJavaFile'
    }).then((javaCompiledName) => {
        if (javaCompiledName) {
            const extension = getLanguageConfig('java', 'extension');
            const compiler = getLanguageConfig('java', 'compiler');
            const javaCompiledPath = path.join(os.tmpdir(), javaCompiledName);
            const javaSourcePath = `${javaCompiledPath}.${extension}`;

            // SECURITY: Only Owner Read and Write
            fs.writeFileSync(javaSourcePath, code, { mode: 0o600 });
            tempFilePaths.push(javaSourcePath);

            compileHandler(`${compiler} ${javaSourcePath}`, (success) => {
                if (success) {
                    runCommand(`java -cp ${os.tmpdir()} ${javaCompiledName}`, type);
                    tempFilePaths.push(`${javaCompiledPath}.class`);
                }
            });
        }
    });
}

// Save code to a temporary file and execute it
// For compiled languages, a child process is created for compilation additionally
export function executeCodeBlock(language: string, code: string, type: string) {
    const compiledName = `temp_${Date.now()}`;
    const compiledPath = path.join(os.tmpdir(), compiledName);
    const extension = getLanguageConfig(language, 'extension');
    const compiler = getLanguageConfig(language, 'compiler');
    const sourcePath = `${compiledPath}.${extension}`;

    // Read and store the Python Path configuration boolean
    const config = vscode.workspace.getConfiguration();
    const pythonPathEnabled = config.get<boolean>('markdownRunner.pythonPath');

    // Inject the markdown file's path into the code
    const editor = vscode.window.activeTextEditor;
    if (pythonPathEnabled && editor && language === 'python') {
        const documentUri = editor.document.uri;
        const documentDirectory = path.dirname(documentUri.fsPath);
        code = `import sys\nsys.path.insert(0, r'${documentDirectory}')\n` + code;
    }

    // SECURITY: Only Owner Read and Write
    fs.writeFileSync(sourcePath, code, { mode: 0o600 });
    tempFilePaths.push(sourcePath);

    if (language === 'c' || language === 'cpp' || language === 'rust') {
        // If a compiled language, then compile it 
        compileHandler(`${compiler} -o ${compiledPath} ${sourcePath}`, (success) => {
            if (success) {
                runCommand(compiledPath, type);
                tempFilePaths.push(compiledPath);
            }
        });
    } else {
        // If not a compiled language, then run it
        runCommand(`${compiler} ${sourcePath}`, type);
    }
}

// If successful compilation, it allows `executeCodeBlock` to execute the file
// Otherwise, it throws an error message
function compileHandler(command: string, callback: (success: boolean) => void): void {
    cp.exec(command, (error, stdout, stderr) => {
        if (error) {
            // timeout is necessary because of interference with codelens
            setTimeout(() => {
                vscode.window.showErrorMessage(stderr, { modal: true });
            }, 100);
            callback(false);
        } else {
            callback(true);
        }
    });
}

// Run the code, either in terminal or as child process, then save results in markdown file
export function runCommand(code: string, type: string) {
    if (type === 'run') {
        const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
        terminal.show();
        terminal.sendText(code);
    } else if (type === 'save') {
        runOnMarkdown(code);
    }
}

// Run command on the markdown file itself
function runOnMarkdown(code: string) {
    const runner = cp.spawn(code, [], { shell: true });
    runner.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    runner.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
}

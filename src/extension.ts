import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Stores the paths of the temporary files created for running code
const tempFilePaths: string[] = [];

// - Generate the code lens with the required parameters
// - Helper for provideCodeLenses
function createCodeLens(document: vscode.TextDocument, line: number, title: string, 
    commandString: string, code: string): vscode.CodeLens {
    const range = document.lineAt(line).range;
    const command: vscode.Command = {
        title: title,
        command: commandString,
        arguments: [code]
    };
    return new vscode.CodeLens(range, command);
}

// - Parses all code blocks:
//     - Determine the line number
//     - Parse the code
// - Render the buttons at the parsed line number
// - Give each button the correct title based on the code block type
// - Assign each button the right code runner based on the code block type
// - Pass the code to the code runner
export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
    onDidChangeCodeLenses?: vscode.Event<void>;

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const codeBlockRegex = /```([\s\S]+?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(document.getText())) !== null) {
            let code = match[1].trim();
            code = code.replace(/^[^\n]*\n/, '');
            const line = document.positionAt(match.index).line;
            
            if (match[0].includes('python')) {
                const codeLens = createCodeLens(
                    document, line, "Run Python Code Block",
                    "markdown.run.python", code
                );
                codeLenses.push(codeLens);
            }
        }

        return codeLenses;
    }

    resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        return null;
    }
}

// - If there exists an active terminal, use that one
// - Else, create a new terminal and use that
// - Display the terminal
// - Execute the code within that terminal
function runCommandInTerminal(command: string) {
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.show();
    terminal.sendText(command);
}

// - Creates a temporary file with a unique name
// - Writes the parsed Python code to that file
// - Runs the temporary file
function executePythonCodeBlock(code: string) {
    const tempFileName = `temp_${Date.now()}.py`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    tempFilePaths.push(tempFilePath);

    fs.writeFileSync(tempFilePath, code);

    runCommandInTerminal(`python "${tempFilePath}"`);
}

// Main function that runs when the extension is activated
// - Handles request for running a Python Code Block
// - Initializes and runs the code lens buttons
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.run.python', (arg) => {
            if (typeof arg === 'string') {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    executePythonCodeBlock(arg);
                } else {
                    vscode.window.showErrorMessage('No active text editor!');
                }
            } else {
                vscode.window.showErrorMessage('Do not use this command!');
            }
        })
    );

    context.subscriptions.push(
		vscode.languages.registerCodeLensProvider({ language: 'markdown', scheme: 'file' },
            new ButtonCodeLensProvider()
        )
	);
}

// Deletes the temporary files that were generated during the extension's usage
// when the extension is deactivated or VS Code is closed
export function deactivate() {
    tempFilePaths.forEach(filePath => {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
        }
    });
}
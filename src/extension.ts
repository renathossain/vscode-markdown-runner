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
            let codeBlockType = match[0].split('\n')[0].substring(3).trim();
            code = code.replace(/^[^\n]*\n/, ''); // remove code block type
            const line = document.positionAt(match.index).line;
            
            if (codeBlockType.includes('python')) {
                const codeLens = createCodeLens(
                    document, line, "Run Python Block",
                    "markdown.run.python", code
                );
                codeLenses.push(codeLens);
            } else if (codeBlockType.includes('bash')) {
                const codeLens = createCodeLens(
                    document, line, "Run Bash Block",
                    "markdown.run.bash", code
                );
                codeLenses.push(codeLens);
            } else if (codeBlockType === "") {
                const codeLens = createCodeLens(
                    document, line, "Run in Terminal",
                    "markdown.run.terminal", code
                );
                codeLenses.push(codeLens);
            }

            const codeLens = createCodeLens(
                document, line, "Copy",
                "markdown.copy", code
            );
            codeLenses.push(codeLens);
        }

        return codeLenses;
    }

    resolveCodeLens?(): vscode.ProviderResult<vscode.CodeLens> {
        return null;
    }
}

// - If there exists an active terminal, display and run code in that one
// - Otherwise, create a new terminal to run the code
function runCommandInTerminal(command: string) {
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.show();
    terminal.sendText(command);
}

// - Creates a temporary file with a unique name
// - Writes the parsed code to that file
// - Runs the temporary file
function executeCodeBlock(extension: string, command: string, code: string) {
    const tempFileName = `temp_${Date.now()}.${extension}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    tempFilePaths.push(tempFilePath);

    fs.writeFileSync(tempFilePath, code);

    runCommandInTerminal(`${command} "${tempFilePath}"`);
}

// Run the code line by line the terminal 
export function runCommandsInTerminal(code: string) {
    const lines = code.split('\n');
    for (const line of lines) {
        if (line.trim() !== '') { // Ignore empty lines
            runCommandInTerminal(line);
        }
    }
}

// Main function that runs when the extension is activated
// - Initializes and runs the code lens buttons
// - Handles request for running a Python Code Block
// - Handles request for running a Bash Code Block
// - Handles request for copying a Code Block
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
		vscode.languages.registerCodeLensProvider({ language: 'markdown', scheme: 'file' },
            new ButtonCodeLensProvider()
        )
	);

    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.run.python', async (code: string) => {
            await executeCodeBlock('py', 'python', code);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.run.bash', async (code: string) => {
            await executeCodeBlock('sh', 'bash', code);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.run.terminal', async (code: string) => {
            await runCommandsInTerminal(code);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.copy', async (code: string) => {
            await vscode.env.clipboard.writeText(code);;
            vscode.window.showInformationMessage('Code copied to clipboard.');
        })
    );
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
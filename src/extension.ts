import * as vscode from 'vscode';

function generateButtons(document: vscode.TextDocument): [number, string, number][] {
    const buttons: [number, string, number][] = [];
    const lines = document.getText().split('\n');

    lines.forEach((line, index) => {
        if (line.trim().startsWith("```python")) {
            buttons.push([index, 'Run Python Block', buttons.length]);
        }
    });

    return buttons;
}

export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
    onDidChangeCodeLenses?: vscode.Event<void>;

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const buttons = generateButtons(document);
        for (const [line, title, arg] of buttons) {
            const range = document.lineAt(line).range;
            const command: vscode.Command = {
                title: title,
                command: 'markdown.run.python',
                arguments: [arg]
            };
            const codeLens = new vscode.CodeLens(range, command);
            codeLenses.push(codeLens);
        }
        return codeLenses;
    }

    resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        return null;
    }
}

function runCommandInTerminal(command: string) {
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.show();
    terminal.sendText(command);
}

function executePythonCodeBlock(code: string) {
	runCommandInTerminal(`python -c "${code}"`);
}

function runPythonCodeBlock(index: number, pythonCodeBlocks: string[]) {
    if (index < 0 || index >= pythonCodeBlocks.length) {
        vscode.window.showErrorMessage('Invalid index for Python code block.');
        return;
    }

    executePythonCodeBlock(pythonCodeBlocks[index]);
}

function extractPythonCodeBlocks(text: string): string[] {
    const codeBlocks: string[] = [];

	// Currently, there is a bug where headers such as `python23` are accepted
	// Think of it as a feature or fix the regex
    const regex = /```python\s*([\s\S]+?)\s*```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        codeBlocks.push(match[1]);
    }

    return codeBlocks;
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.run.python', (arg) => {
            if (typeof arg === 'number') {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const pythonCodeBlocks = extractPythonCodeBlocks(editor.document.getText());
                    runPythonCodeBlock(arg, pythonCodeBlocks);
                } else {
                    vscode.window.showErrorMessage('No active text editor!');
                }
            } else {
                vscode.window.showErrorMessage('Do not use this command.');
            }
        })
    );

    context.subscriptions.push(
		vscode.languages.registerCodeLensProvider({ language: 'markdown', scheme: 'file' },
            new ButtonCodeLensProvider()
        )
	);
}

export function deactivate() {}

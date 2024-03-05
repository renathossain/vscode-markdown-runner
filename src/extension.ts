import * as vscode from 'vscode';

let pythonCodeBlocks: string[] = [];

let buttons: [number, string, number][] = [
    [0, 'Test Button 1', 0],
    [5, 'Test Button 2', 1],
    // Add more tuples as needed
];

export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
    private buttons: [number, string, number][] = [];

    constructor(buttons: [number, string, number][]) {
        this.buttons = buttons;
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        for (const [line, title, arg] of this.buttons) {
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

    resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens {
        return codeLens;
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

function updatePythonCodeBlocks(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext) {
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor!');
        return;
    }

    pythonCodeBlocks = extractPythonCodeBlocks(editor.document.getText());

    let codeLensProvider = new ButtonCodeLensProvider(buttons);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider)
    );
}

function runPythonCodeBlock(index: number) {
    if (index < 0 || index >= pythonCodeBlocks.length) {
        vscode.window.showErrorMessage('Invalid index for Python code block.');
        return;
    }

    executePythonCodeBlock(pythonCodeBlocks[index]);
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.run.python', (arg) => {
            if (typeof arg === 'number') {
                runPythonCodeBlock(arg);
            } else {
                vscode.window.showErrorMessage('Do not use this command.');
            }
        })
    );    

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'markdown') {
        updatePythonCodeBlocks(editor, context);
    }

    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'markdown') {
            updatePythonCodeBlocks(vscode.window.activeTextEditor, context);
        }
    });
}

export function deactivate() {}

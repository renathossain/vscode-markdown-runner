import * as vscode from 'vscode';

let pythonCodeBlocks: string[] = [];

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
    const regex = /```python\s*([\s\S]+?)\s*```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        codeBlocks.push(match[1]);
    }

    return codeBlocks;
}

function updatePythonCodeBlocks(editor: vscode.TextEditor | undefined) {
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor!');
        return;
    }

    pythonCodeBlocks = extractPythonCodeBlocks(editor.document.getText());
}

function runFirstPythonCodeBlock() {
    if (pythonCodeBlocks.length === 0) {
        vscode.window.showInformationMessage('No Python code blocks found in the active document.');
        return;
    }

	executePythonCodeBlock(pythonCodeBlocks[0]);
}

export function activate(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'markdown') {
        updatePythonCodeBlocks(editor);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.run.python', () => {
            runFirstPythonCodeBlock();
        })
    );

    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'markdown') {
            updatePythonCodeBlocks(vscode.window.activeTextEditor);
        }
    });
}

export function deactivate() {}

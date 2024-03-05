import * as vscode from 'vscode';
import { ButtonCodeLensProvider } from './button';

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

	// Currently, there is a bug where headers such as `python23` are accepted
	// Think of it as a feature or fix the regex
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

function runPythonCodeBlock(index: number) {
    if (index < 0 || index >= pythonCodeBlocks.length) {
        vscode.window.showErrorMessage('Invalid index for Python code block.');
        return;
    }

    executePythonCodeBlock(pythonCodeBlocks[index]);
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.run.python', () => {
            runPythonCodeBlock(0);
        })
    );

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'markdown') {
        updatePythonCodeBlocks(editor);
    }

    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'markdown') {
            updatePythonCodeBlocks(vscode.window.activeTextEditor);
        }
    });

    let codeLensProvider = new ButtonCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider)
    );
}

export function deactivate() {}

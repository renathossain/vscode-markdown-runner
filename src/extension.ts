import * as vscode from 'vscode';

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

function executePythonCodeBlocks(editor: vscode.TextEditor | undefined) {
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor!');
        return;
    }

    const pythonCodeBlocks = extractPythonCodeBlocks(editor.document.getText());
    
    if (pythonCodeBlocks.length === 0) {
        vscode.window.showInformationMessage('No Python code blocks found in the active document.');
        return;
    }

    pythonCodeBlocks.forEach((block, index) => {
        console.log(`Executing Python Code Block ${index + 1}:`);
        console.log(block);
        executePythonCodeBlock(block);
    });
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('markdown.run.python', () => {
			const editor = vscode.window.activeTextEditor;
			executePythonCodeBlocks(editor);
		})
	);
}

export function deactivate() {}

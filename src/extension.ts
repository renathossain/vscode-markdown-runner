import * as vscode from 'vscode';

function runCommandInTerminal(command: string) {
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.show();
    terminal.sendText(command);
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('markdown.run.python', () => {
			runCommandInTerminal('python test.py');
		})
	);
}

export function deactivate() {}

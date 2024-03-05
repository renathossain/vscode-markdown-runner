import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('markdown.run.python', () => {
			const terminal = vscode.window.createTerminal();
			terminal.show();
		})
	);
}

export function deactivate() {}

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('markdown.run.python', () => {
        vscode.window.showInformationMessage('Button clicked!');
        console.log('Button clicked!');
    });

    context.subscriptions.push(disposable);

    // Register CodeLens provider
    let codeLensProvider = new TestButtonCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider)
    );
}

export function deactivate() {}

class TestButtonCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        // Create a CodeLens at the beginning of the document
        const line = new vscode.Range(0, 0, 0, 0);
        const command: vscode.Command = {
            title: 'Test Button',
            command: 'markdown.run.python',
            arguments: []
        };
        const codeLens = new vscode.CodeLens(line, command);
        return [codeLens];
    }

    resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens {
        return codeLens;
    }
}

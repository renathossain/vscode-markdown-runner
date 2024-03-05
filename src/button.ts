import * as vscode from 'vscode';

export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
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

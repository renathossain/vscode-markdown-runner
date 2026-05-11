import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

suite("Run on Markdown", () => {
  test("Python", async () => {
    const file = path.join(__dirname, "test.md");
    fs.writeFileSync(file, '```python\nprint("hello")\n```\n');

    const doc = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(doc);

    const ext = vscode.extensions.getExtension("renathossain.markdown-runner");
    await ext?.activate();

    const finished = new Promise<void>((resolve) => {
      const sub = ext?.exports.runFinishedEmitter.event(() => {
        sub.dispose();
        resolve();
      });
    });

    await vscode.commands.executeCommand(
      "markdown.runOnMarkdown",
      "python",
      'print("hello")',
      new vscode.Range(0, 0, 2, 3),
    );

    await finished;

    assert.strictEqual(
      doc.getText().trim(),
      '```python\nprint("hello")\n```\n\n```result\nhello\n```',
    );
  });
});

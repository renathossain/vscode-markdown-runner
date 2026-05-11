import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const ext = vscode.extensions.getExtension("renathossain.markdown-runner");

async function runTest(lang: string, code: string, result: string) {
  const file = path.join(__dirname, `test-${lang}.md`);
  fs.writeFileSync(file, `\`\`\`${lang}\n${code}\n\`\`\`\n`);

  const doc = await vscode.workspace.openTextDocument(file);
  await vscode.window.showTextDocument(doc);

  const finished = new Promise<void>((resolve) => {
    const sub = ext!.exports.runFinishedEmitter.event(() => {
      sub.dispose();
      resolve();
    });
  });

  const text = doc.getText();
  const range = new vscode.Range(
    doc.positionAt(text.indexOf("```")),
    doc.positionAt(text.lastIndexOf("```") + 3),
  );

  await vscode.commands.executeCommand(
    "markdown.runOnMarkdown",
    lang,
    code,
    range,
  );

  await finished;
  assert.ok(doc.getText().includes(result));
}

suite("Run on Markdown", () => {
  const result = "```result\n82\n```";

  suiteSetup(async () => {
    await ext?.activate();
  });

  test("Python", async () => {
    await runTest("python", "print(10 + 72)", result);
  });
});

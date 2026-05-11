import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const ext = vscode.extensions.getExtension("renathossain.markdown-runner");
const isWindows = process.platform === "win32";

suite("Run File", function () {
  this.timeout(60000);
  suiteSetup(async () => ext?.activate());
  test("Python", async () => {
    const file = path.join(os.tmpdir(), `test-runfile.md`);
    const code = `with open(r"${file.replace(/\\/g, "/")}", "w") as f: f.write(str(10 + 72))`;
    await vscode.commands.executeCommand("markdown.runFile", "python", code);
    const start = Date.now();
    while (Date.now() - start < 10000) {
      if (fs.existsSync(file) && fs.readFileSync(file, "utf-8").trim() === "82")
        break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.strictEqual(fs.readFileSync(file, "utf-8").trim(), "82");
  });
});

async function testRunOnMarkdown(lang: string, code: string, result: string) {
  const file = path.join(os.tmpdir(), `test-${lang}.md`);
  const codeBlock = `\`\`\`${lang}\n${code}\n\`\`\`\n`;
  fs.writeFileSync(file, codeBlock);

  const doc = await vscode.workspace.openTextDocument(file);
  await vscode.window.showTextDocument(doc);

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

  assert.strictEqual(doc.getText(), codeBlock + "\n" + result + "\n");
}

suite("Run on Markdown", function () {
  this.timeout(60000);
  const result = "```result\n82\n```";
  suiteSetup(async () => ext?.activate());

  const javaCode = `public class Main{public static void main(String[]a){System.out.println(10+72);}}`;
  const cases: Array<[string, string, string]> = [
    ["Python", "python", "print(10 + 72)"],
    ["C", "c", `#include <stdio.h>\nint main(){printf("%d",10+72);return 0;}`],
    ["Java", "java", javaCode],
    ["C++", "cpp", `#include <iostream>\nint main(){std::cout<<10+72;}`],
    ["Rust", "rust", `fn main(){println!("{}",10+72);}`],
    ["TypeScript", "typescript", `console.log(10 + 72);`],
    ["PHP", "php", `<?php echo 10 + 72;`],
    ["Perl", "perl", `print 10 + 72`],
    ["R", "r", `cat(10 + 72)`],
    ["Dart", "dart", `void main()=>print(10+72);`],
    ["Groovy", "groovy", `println 10 + 72`],
    ["Go", "go", `package main\nimport "fmt"\nfunc main(){fmt.Println(10+72)}`],
    ["Haskell", "haskell", `main = print (10 + 72)`],
    ["Julia", "julia", `println(10 + 72)`],
    ["Lua", "lua", `print(10 + 72)`],
    ["Ruby", "ruby", `puts 10 + 72`],
    ["JavaScript", "javascript", `console.log(10 + 72);`],
  ];

  cases.forEach(([name, lang, code]) => {
    test(name, () => testRunOnMarkdown(lang, code, result));
  });

  const shellTestName = isWindows ? "PowerShell" : "Bash";
  test(shellTestName, async () => {
    const lang = isWindows ? "powershell" : "bash";
    const code = isWindows ? `Write-Output 82` : `echo 82`;
    await testRunOnMarkdown(lang, code, result);
  });
});

suite("Copy", function () {
  this.timeout(60000);
  suiteSetup(async () => ext?.activate());
  test("Code", async () => {
    const code = `node -v`;
    await vscode.commands.executeCommand("markdown.copy", code);
    assert.strictEqual(await vscode.env.clipboard.readText(), code);
  });
});

suite("Delete", function () {
  this.timeout(60000);
  suiteSetup(async () => ext?.activate());
  test("Code", async () => {
    const file = path.join(os.tmpdir(), `test-delete.md`);
    const codeBlock = `\`\`\`python\nprint(10 + 72)\n\`\`\`\n`;
    fs.writeFileSync(file, codeBlock);

    const doc = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(doc);

    const text = doc.getText();
    const range = new vscode.Range(
      doc.positionAt(text.indexOf("```")),
      doc.positionAt(text.lastIndexOf("```") + 3),
    );

    await vscode.commands.executeCommand("markdown.delete", range);
    assert.strictEqual(doc.getText(), "\n");
  });
});

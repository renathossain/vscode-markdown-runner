import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const ext = vscode.extensions.getExtension("renathossain.markdown-runner");

async function runTest(lang: string, code: string, result: string) {
  const file = path.join(os.tmpdir(), `test-${lang}.md`);
  const testString = `\`\`\`${lang}\n${code}\n\`\`\`\n`;
  fs.writeFileSync(file, testString);

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

  assert.strictEqual(doc.getText(), testString + "\n" + result + "\n");
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
    test(name, () => runTest(lang, code, result));
  });

  const isWindows = process.platform === "win32";
  const shellTestName = isWindows ? "PowerShell" : "Bash";
  test(shellTestName, async () => {
    const lang = isWindows ? "powershell" : "bash";
    const code = isWindows ? `Write-Output 82` : `echo 82`;
    await runTest(lang, code, result);
  });
});

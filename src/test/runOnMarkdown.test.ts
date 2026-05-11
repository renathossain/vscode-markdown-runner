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

  assert.ok(doc.getText().includes(result));
}

suite("Run on Markdown", function () {
  this.timeout(10000);
  const result = "```result\n82\n```";
  suiteSetup(async () => ext?.activate());

  const cases: Array<[string, string, string]> = [
    ["Python", "python", "print(10 + 72)"],
    [
      "C",
      "c",
      `
#include <stdio.h>

int main() {
  printf("%d", 10 + 72);
  return 0;
}`.trim(),
    ],
    [
      "Java",
      "java",
      `
public class Main {
  public static void main(String[] args) {
    System.out.println(10 + 72);
  }
}`.trim(),
    ],
    [
      "C++",
      "cpp",
      `
#include <iostream>
using namespace std;

int main() {
  cout << 10 + 72;
}`.trim(),
    ],
    [
      "Rust",
      "rust",
      `
fn main() {
  println!("{}", 10 + 72);
}`.trim(),
    ],
    ["TypeScript", "typescript", `console.log(10 + 72);`],
    ["PHP", "php", `<?php echo 10 + 72;`],
    ["Perl", "perl", `print 10 + 72`],
    ["R", "r", `cat(10 + 72)`],
    ["Dart", "dart", `void main() => print(10 + 72);`],
    ["Groovy", "groovy", `println 10 + 72`],
    [
      "Go",
      "go",
      `
package main
import "fmt"

func main() {
  fmt.Println(10 + 72)
}`.trim(),
    ],
    ["Haskell", "haskell", `main = print (10 + 72)`],
    ["Julia", "julia", `println(10 + 72)`],
    ["Lua", "lua", `print(10 + 72)`],
    ["Ruby", "ruby", `puts 10 + 72`],
    ["JavaScript", "javascript", `console.log(10 + 72);`],
  ];

  cases.forEach(([name, lang, code]) => {
    test(name, () => runTest(lang, code, result));
  });
});

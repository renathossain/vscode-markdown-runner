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

suite("Run on Markdown", function () {
  this.timeout(10000);
  const result = "```result\n82\n```";

  suiteSetup(async () => {
    await ext?.activate();
  });

  test("Python", async () => {
    await runTest("python", "print(10 + 72)", result);
  });

  test("C", async () => {
    await runTest(
      "c",
      `
  #include <stdio.h>

  int main() {
    printf("%d", 10 + 72);
    return 0;
  }
        `.trim(),
      result,
    );
  });

  test("Java", async () => {
    await runTest(
      "java",
      `
  public class Main {
    public static void main(String[] args) {
      System.out.println(10 + 72);
    }
  }
        `.trim(),
      result,
    );
  });

  test("C++", async () => {
    await runTest(
      "cpp",
      `
  #include <iostream>
  using namespace std;

  int main() {
    cout << 10 + 72;
  }
        `.trim(),
      result,
    );
  });

  test("Rust", async () => {
    await runTest(
      "rust",
      `
  fn main() {
    println!("{}", 10 + 72);
  }
        `.trim(),
      result,
    );
  });

  //   test("TypeScript", async () => {
  //     await runTest("typescript", `console.log(10 + 72);`, result);
  //   });

  //   test("PHP", async () => {
  //     await runTest("php", `<?php echo 10 + 72;`, result);
  //   });

  //   test("Perl", async () => {
  //     await runTest("perl", `print 10 + 72`, result);
  //   });

  //   test("R", async () => {
  //     await runTest("r", `cat(10 + 72)`, result);
  //   });

  test("Dart", async () => {
    await runTest("dart", `void main() => print(10 + 72);`, result);
  });

  //   test("Groovy", async () => {
  //     await runTest("groovy", `println 10 + 72`, result);
  //   });

  test("Go", async () => {
    await runTest(
      "go",
      `
  package main
  import "fmt"

  func main() {
    fmt.Println(10 + 72)
  }
        `.trim(),
      result,
    );
  });

  //   test("Haskell", async () => {
  //     await runTest("haskell", `main = print (10 + 72)`, result);
  //   });

  test("Julia", async () => {
    await runTest("julia", `println(10 + 72)`, result);
  });

  test("Lua", async () => {
    await runTest("lua", `print(10 + 72)`, result);
  });

  test("Ruby", async () => {
    await runTest("ruby", `puts 10 + 72`, result);
  });

  test("JavaScript", async () => {
    await runTest("javascript", `console.log(10 + 72);`, result);
  });
});

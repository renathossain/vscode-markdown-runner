import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ButtonCodeLensProvider } from "../codeLens";
import { InlineCodeLinkProvider, InlineCodeHoverProvider } from "../codeLinks";

const publisherId = "renathossain.markdown-runner";
const ext = vscode.extensions.getExtension(publisherId);
const isWindows = process.platform === "win32";
const setup = async () => {
  await ext?.activate();
  await vscode.workspace
    .getConfiguration()
    .update(
      "markdownRunner.defaultCodes",
      undefined,
      vscode.ConfigurationTarget.Global,
    );
};

suite("Activation", function () {
  this.timeout(60000);
  suiteSetup(setup);

  const cases: Array<[string, boolean]> = [
    ["a.md", true],
    ["a.qmd", true],
    ["a.txt", false],
  ];

  test("By File Type", async () => {
    for (const [file, should] of cases) {
      const filePath = path.join(os.tmpdir(), file);
      fs.writeFileSync(filePath, "```python\nprint(10 + 72)\n```");
      const doc = await vscode.workspace.openTextDocument(filePath);

      const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
        "vscode.executeCodeLensProvider",
        doc.uri,
      );

      assert.strictEqual((lenses?.length ?? 0) > 0, should, file);
    }
  });
});

suite("CodeLens", function () {
  this.timeout(60000);
  suiteSetup(setup);

  test("Python", async () => {
    const text = "```python\nprint(10 + 72)\n```\n";
    const file = path.join(os.tmpdir(), "test-lens.md");
    fs.writeFileSync(file, text);

    const doc = await vscode.workspace.openTextDocument(file);
    const provider = new ButtonCodeLensProvider();
    const lenses = provider.provideCodeLenses(doc);

    const range = new vscode.Range(0, 0, 2, 3);
    const clear = new vscode.Range(1, 0, 2, 0);
    const del = new vscode.Range(0, 0, 3, 0);

    assert.deepStrictEqual(
      lenses.map((x) => ({
        title: x.command?.title,
        command: x.command?.command,
        args: x.command?.arguments,
        range: x.range,
      })),
      [
        {
          title: "Run Python Block",
          command: "markdown.runFile",
          args: ["python", "print(10 + 72)\n"],
          range,
        },
        {
          title: "Run on Markdown",
          command: "markdown.runOnMarkdown",
          args: ["python", "print(10 + 72)\n", range],
          range,
        },
        {
          title: "Copy",
          command: "markdown.copy",
          args: ["print(10 + 72)\n"],
          range,
        },
        {
          title: "Clear",
          command: "markdown.delete",
          args: [clear],
          range,
        },
        {
          title: "Delete",
          command: "markdown.delete",
          args: [del],
          range,
        },
      ],
    );
  });
});

suite("Inline Code Links", function () {
  this.timeout(60000);
  suiteSetup(setup);

  test("Link", async () => {
    const text = "Run `node -v` now";
    const file = path.join(os.tmpdir(), "test-link.md");
    fs.writeFileSync(file, text);

    const doc = await vscode.workspace.openTextDocument(file);
    const provider = new InlineCodeLinkProvider();
    const links = provider.provideDocumentLinks(doc);

    const code = "node -v";
    const command = `command:markdown.runInTerminal?${encodeURIComponent(JSON.stringify([code]))}`;

    assert.deepStrictEqual(links, [
      new vscode.DocumentLink(
        new vscode.Range(0, 4, 0, 13),
        vscode.Uri.parse(command),
      ),
    ]);
  });
});

suite("Inline Code Hover", function () {
  this.timeout(60000);
  suiteSetup(setup);

  test("Hover", async () => {
    const text = "Run `node -v` now";
    const file = path.join(os.tmpdir(), "test-hover.md");
    fs.writeFileSync(file, text);

    const doc = await vscode.workspace.openTextDocument(file);
    const provider = new InlineCodeHoverProvider();
    const hover = provider.provideHover(doc, new vscode.Position(0, 8));

    const code = "node -v";
    const command = `[Copy to clipboard](command:markdown.copy?${encodeURIComponent(JSON.stringify([code]))})`;

    assert.deepStrictEqual(
      hover,
      new vscode.Hover(
        (() => {
          const md = new vscode.MarkdownString(command);
          md.isTrusted = true;
          return md;
        })(),
        new vscode.Range(0, 4, 0, 13),
      ),
    );
  });
});

suite("Run File", function () {
  this.timeout(60000);
  suiteSetup(setup);
  test("Python", async () => {
    const file = path.join(os.tmpdir(), `test-runfile.out`);
    const code = `with open(r"${file.replace(/\\/g, "/")}", "w") as f: f.write(str(10 + 72))`;

    await vscode.commands.executeCommand("markdown.runFile", "python", code);

    for (
      let i = 0;
      i < 100 &&
      (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== "82");
      i++
    )
      await new Promise((r) => setTimeout(r, 100));

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
  suiteSetup(setup);

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
  suiteSetup(setup);
  test("Code", async () => {
    const code = `node -v`;
    await vscode.commands.executeCommand("markdown.copy", code);
    assert.strictEqual(await vscode.env.clipboard.readText(), code);
  });
});

suite("Delete", function () {
  this.timeout(60000);
  suiteSetup(setup);
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

suite("Code Manipulation", function () {
  this.timeout(60000);
  suiteSetup(setup);

  test("Python Path", async () => {
    const dir = path.join(os.tmpdir(), "helpers");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "math.py"), "def add(a,b): return a+b");

    const md = path.join(os.tmpdir(), "test-python-path.md");
    const code = `from helpers.math import add\nprint(add(10,72))`;
    fs.writeFileSync(md, `\`\`\`python\n${code}\n\`\`\`\n`);

    const doc = await vscode.workspace.openTextDocument(md);
    await vscode.window.showTextDocument(doc);

    await vscode.commands.executeCommand(
      "markdown.runOnMarkdown",
      "python",
      code,
      new vscode.Range(0, 0, 2, 3),
    );

    assert.strictEqual(doc.getText().includes("82"), true);
  });

  async function run(code: string, expected: string, fileName: string) {
    const text = `\`\`\`python\n${code}\n\`\`\`\n`;
    const file = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(file, text);

    const doc = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(doc);

    const range = new vscode.Range(0, 0, 2, 3);

    await vscode.commands.executeCommand(
      "markdown.runOnMarkdown",
      "python",
      code,
      range,
    );

    assert.strictEqual(
      doc.getText(),
      text + `\n\`\`\`result\n${expected}\n\`\`\`\n`,
    );
  }

  test("Default Codes Prepend", async () => {
    await vscode.workspace
      .getConfiguration()
      .update(
        "markdownRunner.defaultCodes",
        { python: "result = 10 + 72\n" },
        vscode.ConfigurationTarget.Global,
      );

    await run(`print(result)`, "82", "test-prepend.md");
  });

  test("Default Codes Insert At", async () => {
    await vscode.workspace
      .getConfiguration()
      .update(
        "markdownRunner.defaultCodes",
        { python: "-I@ print(@)" },
        vscode.ConfigurationTarget.Global,
      );

    await run("10 + 72", "82", "test-insert-at.md");
  });
});

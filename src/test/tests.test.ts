// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ButtonCodeLensProvider } from "../codeLens";
import { InlineCodeLinkProvider, InlineCodeHoverProvider } from "../codeLinks";

const isUri = (arg: unknown): arg is vscode.Uri =>
  typeof arg === "object" && arg !== null && "scheme" in arg;
const stripEditor = (args: unknown[]) =>
  args.length > 0 && isUri(args[args.length - 1]) ? args.slice(0, -1) : args;
const publisherId = "renathossain.markdown-runner";
const ext = vscode.extensions.getExtension(publisherId);
const isWindows = process.platform === "win32";
const tmp = (filename: string) => path.join(os.tmpdir(), filename);
const write = (filename: string, code: string) =>
  fs.writeFileSync(tmp(filename), code);
const open = (filename: string) =>
  vscode.workspace.openTextDocument(tmp(filename));
const setCfg = (config: string, value: unknown) =>
  vscode.workspace
    .getConfiguration()
    .update(config, value, vscode.ConfigurationTarget.Global);
const clearCfg = (config: string) => setCfg(config, undefined);
const runOnMarkdown = (lang: string, code: string, range: vscode.Range) =>
  vscode.commands.executeCommand<{ pid: number; done: Promise<void> }>(
    "markdown.runOnMarkdown",
    lang,
    code,
    range,
  );

const setup = async () => {
  await ext?.activate();
  await clearCfg("markdownRunner.defaultCodes");
  await clearCfg("markdownRunner.enabledButtons");
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
      write(file, "```python\nprint(10 + 72)\n```");
      const doc = await open(file);
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
    write("test-lens.md", "```python\nprint(10 + 72)\n```\n");
    const doc = await open("test-lens.md");
    const provider = new ButtonCodeLensProvider();
    const lenses = await provider.provideCodeLenses(doc);
    const range = new vscode.Range(0, 0, 2, 3);
    assert.deepStrictEqual(
      lenses.map((x) => ({
        title: x.command?.title,
        command: x.command?.command,
        args: stripEditor(x.command?.arguments ?? []),
        range: x.range,
      })),
      [
        {
          title: "Run Python Block",
          command: "markdown.runBlock",
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
        { title: "Clear", command: "markdown.clear", args: [range], range },
        { title: "Delete", command: "markdown.delete", args: [range], range },
      ],
    );
  });
  test("Enabled Buttons", async () => {
    await setCfg("markdownRunner.enabledButtons", {
      runBlock: false,
      copy: false,
      delete: false,
    });
    try {
      write("test-enabled-buttons.md", "```python\nprint(10 + 72)\n```\n");
      const doc = await open("test-enabled-buttons.md");
      const provider = new ButtonCodeLensProvider();
      assert.deepStrictEqual(
        (await provider.provideCodeLenses(doc)).map(
          (lens) => lens.command?.title,
        ),
        ["Run on Markdown", "Clear"],
      );
    } finally {
      await clearCfg("markdownRunner.enabledButtons");
    }
  });
});

suite("Inline Code Links", function () {
  this.timeout(60000);
  suiteSetup(setup);
  test("Link", async () => {
    write("test-link.md", "Run `node -v` now");
    const doc = await open("test-link.md");
    const provider = new InlineCodeLinkProvider();
    const links = provider.provideDocumentLinks(doc);
    const command = `command:markdown.runInTerminal?${encodeURIComponent(JSON.stringify(["node -v"]))}`;
    assert.deepStrictEqual(links, [
      new vscode.DocumentLink(
        new vscode.Range(0, 4, 0, 13),
        vscode.Uri.parse(command),
      ),
    ]);
  });

  test("Not Inside Fenced Blocks", async () => {
    write("test-link-no-fence.md", "```bash\nRun `node -v` now\n```");
    const doc = await open("test-link-no-fence.md");
    const provider = new InlineCodeLinkProvider();
    assert.deepStrictEqual(provider.provideDocumentLinks(doc), []);
  });
});

suite("Inline Code Hover", function () {
  this.timeout(60000);
  suiteSetup(setup);
  test("Hover", async () => {
    write("test-hover.md", "Run `node -v` now");
    const doc = await open("test-hover.md");
    const provider = new InlineCodeHoverProvider();
    const hover = provider.provideHover(doc, new vscode.Position(0, 8));
    const command = `[Copy to clipboard](command:markdown.copy?${encodeURIComponent(JSON.stringify(["node -v"]))})`;
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

  test("Not Inside Fenced Blocks", async () => {
    write("test-hover-no-fence.md", "```bash\nRun `node -v` now\n```");
    const doc = await open("test-hover-no-fence.md");
    const provider = new InlineCodeHoverProvider();
    assert.strictEqual(
      provider.provideHover(doc, new vscode.Position(1, 8)),
      undefined,
    );
  });
});

suite("Run File", function () {
  this.timeout(60000);
  suiteSetup(setup);
  test("Python", async () => {
    const file = tmp("test-runblock.out");
    const code = `with open(r"${file.replace(/\\/g, "/")}", "w") as f: f.write(str(10 + 72))`;
    await vscode.commands.executeCommand("markdown.runBlock", "python", code);
    for (let i = 0; i < 100; i++) {
      if (fs.existsSync(file) && fs.readFileSync(file, "utf8").trim() === "82")
        break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.strictEqual(fs.readFileSync(file, "utf-8").trim(), "82");
  });
});

suite("Run on Markdown", function () {
  this.timeout(60000);
  suiteSetup(setup);
  const output = "82";
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
  async function run(
    lang: string,
    code: string,
    output: string,
    file?: string,
  ) {
    write(file ?? `test-${lang}.md`, `\`\`\`${lang}\n${code}\n\`\`\`\n`);
    const doc = await open(file ?? `test-${lang}.md`);
    await vscode.window.showTextDocument(doc);
    const text = doc.getText();
    const range = new vscode.Range(
      doc.positionAt(text.indexOf("```")),
      doc.positionAt(text.lastIndexOf("```") + 3),
    );
    const { done } = await runOnMarkdown(lang, code, range);
    await done;
    const re = new RegExp(`\n\`\`\`output\n(.*)${output}\n\`\`\``, "s");
    for (let i = 0; i < 20; i++) {
      if (re.test(doc.getText())) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.match(doc.getText(), re);
  }
  cases.forEach(([name, lang, code]) => {
    test(name, () => run(lang, code, output));
  });
  test(isWindows ? "PowerShell" : "Bash", async () => {
    await run(
      isWindows ? "powershell" : "bash",
      isWindows ? `Write-Output 82` : `echo 82`,
      output,
    );
  });

  test("Newline Behaviour", () =>
    run(
      "python",
      "print('A')\nprint('B')\nprint('C')",
      "A\nB\nC",
      "test-newline.md",
    ));

  test("ANSI Escape Sequences (Spinner)", async () => {
    // Simulate an Ollama-like spinner: overwrite the same line with spinner
    // frames using cursor-to-col-1 + erase-line, then correct a typo via
    // cursor-backward + erase-line, and finally write the result.
    const code = `import sys
sys.stdout.buffer.write('\\u2819\\x1b[1G\\x1b[K\\u2839\\x1b[1G\\x1b[K\\u2838'.encode('utf-8'))
sys.stdout.buffer.write('\\x1b[1G\\x1b[KThe\\x1b[3D\\x1b[KThe answer is 82\\n'.encode('utf-8'))`;
    write("test-ansi.md", `\`\`\`python\n${code}\n\`\`\`\n`);
    const doc = await open("test-ansi.md");
    await vscode.window.showTextDocument(doc);
    const text = doc.getText();
    const range = new vscode.Range(
      doc.positionAt(text.indexOf("```")),
      doc.positionAt(text.lastIndexOf("```") + 3),
    );
    const { done } = await runOnMarkdown("python", code, range);
    await done;
    const output = doc.getText();
    assert.match(output, /```output\n[^]*The answer is 82\n```\n/);
    assert.ok(!output.includes("\x1b"), "escape chars should be stripped");
    assert.ok(!output.includes("⠙"), "spinner frames should be overwritten");
  });

  test("Handle Editor Close", async () => {
    const code = `import time\nfor i in range(6):\n  print('a', flush=True)\n  time.sleep(1)`;
    write("test-handle-close.md", `\`\`\`python\n${code}\n\`\`\`\n`);
    const doc = await open("test-handle-close.md");
    await vscode.window.showTextDocument(doc);
    const text = doc.getText();
    const range = new vscode.Range(
      doc.positionAt(text.indexOf("```")),
      doc.positionAt(text.lastIndexOf("```") + 3),
    );
    const { done } = await runOnMarkdown("python", code, range);
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    await done;
    assert.match(doc.getText(), /```output\n[^]*a\n```\n/);
  });
});

suite("Copy", function () {
  this.timeout(60000);
  suiteSetup(setup);
  test("Code", async () => {
    await vscode.commands.executeCommand("markdown.copy", "node -v");
    assert.strictEqual(await vscode.env.clipboard.readText(), "node -v");
  });
});

suite("Delete", function () {
  this.timeout(60000);
  suiteSetup(setup);
  test("Code", async () => {
    write("test-delete.md", "```python\nprint(10 + 72)\n```\n");
    const doc = await open("test-delete.md");
    await vscode.window.showTextDocument(doc);
    const range = new vscode.Range(0, 0, 2, 3);
    await vscode.commands.executeCommand("markdown.delete", range);
    assert.strictEqual(doc.getText(), "");
  });
});

suite("Kill Processes", function () {
  this.timeout(60000);
  suiteSetup(setup);
  const pids = async () =>
    (
      (await vscode.commands.executeCommand<{ pid: number }[]>(
        "markdown._getProcesses",
      )) ?? []
    ).map((p) => p.pid);
  const run = async (file: string, command: string) => {
    fs.writeFileSync(file, command);
    await vscode.workspace
      .openTextDocument(file)
      .then(vscode.window.showTextDocument);
    return runOnMarkdown(
      "python",
      "while True: pass",
      new vscode.Range(0, 0, 2, 3),
    );
  };
  const waitDead = async (pid: number, done: Promise<void>) => {
    try {
      for (let i = 0; i < 20; i++) {
        try {
          process.kill(pid, 0);
          await new Promise((r) => setTimeout(r, 100));
        } catch {
          return;
        }
      }
      assert.fail(`${pid} still alive`);
    } finally {
      await done;
    }
  };
  test("One", async () => {
    const file = tmp("kill-one.md");
    const { pid, done } = await run(file, "```python\nwhile True: pass\n```");
    assert.ok((await pids()).includes(pid));
    await vscode.commands.executeCommand(
      "markdown.killProcess",
      pid,
      "SIGKILL",
    );
    assert.ok(!(await pids()).includes(pid));
    await waitDead(pid, done);
  });
  test("All", async () => {
    const file = tmp("kill-all.md");
    const { pid, done } = await run(file, "```python\nwhile True: pass\n```");
    assert.ok((await pids()).length > 0);
    await vscode.commands.executeCommand("markdown.killAllProcesses");
    assert.ok(!(await pids()).length);
    await waitDead(pid, done);
  });
});

suite("Code Manipulation", function () {
  this.timeout(60000);
  suiteSetup(setup);
  test("Python Path", async () => {
    const dir = tmp("helpers");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "math.py"), "def add(a,b): return a+b");
    const code = `from helpers.math import add\nprint(add(10,72))`;
    write("test-python-path.md", `\`\`\`python\n${code}\n\`\`\`\n`);
    const doc = await open("test-python-path.md");
    await vscode.window.showTextDocument(doc);
    const { done } = await runOnMarkdown(
      "python",
      code,
      new vscode.Range(0, 0, 2, 3),
    );
    await done;
    assert.ok(doc.getText().includes("82"));
  });
  async function run(code: string, expected: string, fileName: string) {
    const text = `\`\`\`python\n${code}\n\`\`\`\n`;
    write(fileName, text);
    const doc = await open(fileName);
    await vscode.window.showTextDocument(doc);
    const { done } = await runOnMarkdown(
      "python",
      code,
      new vscode.Range(0, 0, 2, 3),
    );
    await done;
    assert.strictEqual(
      doc.getText(),
      text + `\n\`\`\`output\n${expected}\n\`\`\`\n`,
    );
  }
  test("Default Codes Prepend", async () => {
    await setCfg("markdownRunner.defaultCodes", {
      python: "output = 10 + 72\n${code}",
    });
    try {
      await run("print(output)", "82", "test-prepend.md");
    } finally {
      await clearCfg("markdownRunner.defaultCodes");
    }
  });
  test("Default Codes Insert At", async () => {
    await setCfg("markdownRunner.defaultCodes", { python: "print(${code})" });
    try {
      await run("10 + 72", "82", "test-insert-at.md");
    } finally {
      await clearCfg("markdownRunner.defaultCodes");
    }
  });
});

suite("Keyboard Shortcuts", function () {
  this.timeout(60000);
  suiteSetup(setup);

  test("Ctrl+Alt+Enter: runBlock", async () => {
    write(
      "test-kb-runblock.md",
      "```python\nimport sys\nsys.stdout.write(str(10 + 72))\n```\n",
    );
    const doc = await open("test-kb-runblock.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    await vscode.commands.executeCommand("markdown.runBlock");
    assert.ok(
      vscode.window.terminals.length > 0,
      "terminal should exist after runBlock",
    );
  });

  test("Ctrl+Alt+T: runInTerminal", async () => {
    const shell = isWindows ? "powershell" : "bash";
    const command = isWindows ? "Write-Output 82" : "echo 82";
    write("test-kb-terminal.md", "```" + shell + "\n" + command + "\n```\n");
    const doc = await open("test-kb-terminal.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    await vscode.commands.executeCommand("markdown.runInTerminal");
    assert.ok(
      vscode.window.terminals.length > 0,
      "terminal should exist after runInTerminal",
    );
  });

  test("Ctrl+Alt+M: runOnMarkdown", async () => {
    write("test-kb-runon.md", "```python\nprint(10 + 72)\n```\n");
    const doc = await open("test-kb-runon.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    const { done } = await vscode.commands.executeCommand<{
      done: Promise<void>;
    }>("markdown.runOnMarkdown");
    await done;
    assert.match(doc.getText(), /```output\n[^]*82\n```/);
  });

  test("Ctrl+Alt+C: copy", async () => {
    write("test-kb-copy.md", "```python\nprint(10 + 72)\n```\n");
    const doc = await open("test-kb-copy.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    await vscode.commands.executeCommand("markdown.copy");
    assert.strictEqual(
      await vscode.env.clipboard.readText(),
      "print(10 + 72)\n",
    );
  });

  test("Ctrl+Alt+Shift+D: clear", async () => {
    write("test-kb-clear.md", "```python\nprint(10 + 72)\n```\n");
    const doc = await open("test-kb-clear.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    await vscode.commands.executeCommand("markdown.clear");
    assert.strictEqual(doc.getText(), "```python\n```\n");
  });

  test("Ctrl+Alt+D: delete", async () => {
    write("test-kb-delete.md", "```python\nprint(10 + 72)\n```\n");
    const doc = await open("test-kb-delete.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    await vscode.commands.executeCommand("markdown.delete");
    assert.strictEqual(doc.getText(), "");
  });

  test("Ctrl+Alt+K: killProcess", async () => {
    write("test-kb-kill.md", "```python\nwhile True: pass\n```\n");
    const doc = await open("test-kb-kill.md");
    await vscode.window.showTextDocument(doc);
    const { pid, done } = await runOnMarkdown(
      "python",
      "while True: pass",
      new vscode.Range(0, 0, 2, 3),
    );
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    await vscode.commands.executeCommand("markdown.killProcess");
    await done;
    for (let i = 0; i < 20; i++) {
      try {
        process.kill(pid, 0);
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        break;
      }
    }
    try {
      process.kill(pid, 0);
      assert.fail("process should have been killed");
    } catch {
      assert.ok(true, "process exited");
    }
  });

  test("Ctrl+Alt+Shift+K: killAllProcesses", async () => {
    write("test-kb-killall.md", "```python\nwhile True: pass\n```\n");
    const doc = await open("test-kb-killall.md");
    await vscode.window.showTextDocument(doc);
    const { pid, done } = await runOnMarkdown(
      "python",
      "while True: pass",
      new vscode.Range(0, 0, 2, 3),
    );
    await vscode.commands.executeCommand("markdown.killAllProcesses");
    await done;
    for (let i = 0; i < 20; i++) {
      try {
        process.kill(pid, 0);
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        break;
      }
    }
    try {
      process.kill(pid, 0);
      assert.fail("process should have been killed");
    } catch {
      assert.ok(true, "all processes exited");
    }
  });
});

suite("Tabbed Code Blocks", function () {
  this.timeout(60000);
  suiteSetup(setup);

  test("CodeLens Detection", async () => {
    write("test-tabbed-lens.md", "\t```python\n\tprint(10 + 72)\n\t```\n");
    const doc = await open("test-tabbed-lens.md");
    const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      "vscode.executeCodeLensProvider",
      doc.uri,
    );
    assert.ok(
      (lenses?.length ?? 0) > 0,
      "CodeLenses should appear for tabbed blocks",
    );
  });

  test("Run on Markdown", async () => {
    write("test-tabbed-runon.md", "\t```python\nprint(10 + 72)\n\t```\n");
    const doc = await open("test-tabbed-runon.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    const { done } = await vscode.commands.executeCommand<{
      done: Promise<void>;
    }>("markdown.runOnMarkdown");
    await done;
    assert.match(doc.getText(), /[ \t]*```output\n[^]*82\n[ \t]*```/);
  });

  test("Run Block", async () => {
    write("test-tabbed-runblock.md", "\t```bash\n\techo 82\n\t```\n");
    const doc = await open("test-tabbed-runblock.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    await vscode.commands.executeCommand("markdown.runBlock");
    assert.ok(
      vscode.window.terminals.length > 0,
      "terminal should exist for tabbed runBlock",
    );
  });

  test("Copy", async () => {
    write("test-tabbed-copy.md", "\t```python\n\tprint(10 + 72)\n\t```\n");
    const doc = await open("test-tabbed-copy.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    await vscode.commands.executeCommand("markdown.copy");
    assert.strictEqual(
      await vscode.env.clipboard.readText(),
      "print(10 + 72)\n",
    );
  });

  test("Delete", async () => {
    write("test-tabbed-delete.md", "\t```python\n\tprint(10 + 72)\n\t```\n");
    const doc = await open("test-tabbed-delete.md");
    await vscode.window.showTextDocument(doc);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(
      1,
      0,
      1,
      0,
    );
    await vscode.commands.executeCommand("markdown.delete");
    assert.strictEqual(doc.getText(), "");
  });
});

suite("Version Checks", function () {
  test("Consistency", () => {
    const root = path.join(__dirname, "../../");
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    );
    const lock = JSON.parse(
      fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
    );
    const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
    assert.strictEqual(
      pkg.engines.vscode,
      pkg.devDependencies["@types/vscode"],
    );
    assert.strictEqual(
      lock.version || lock.packages?.[""]?.version,
      pkg.version,
    );
    assert.strictEqual(
      changelog.match(/^##\s+([0-9]+\.[0-9]+\.[0-9]+)/m)?.[1],
      pkg.version,
    );
  });
});

// vscode-markdown-runner
// Copyright (C) 2025 Renat Hossain

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as cp from "child_process";
import treeKill from "tree-kill";
import AsyncLock from "async-lock";
import { getLanguageConfig } from "./settings";
import { childProcesses, parseBlock } from "./codeLens";

// List of functions triggered by all commands
export const commandHandlers = [
  {
    command: "markdown.runFile",
    handler: async (language: string, code: string) => {
      runInTerminal(await getRunCommand(language, code));
    },
  },
  {
    command: "markdown.runOnMarkdown",
    handler: async (language: string, code: string, range: vscode.Range) => {
      await runOnMarkdown(await getRunCommand(language, code), range);
    },
  },
  { command: "markdown.runInTerminal", handler: runInTerminal },
  {
    command: "markdown.copy",
    handler: (code: string) => {
      vscode.env.clipboard.writeText(code);
      vscode.window.showInformationMessage("Code copied to clipboard.");
    },
  },
  {
    command: "markdown.stopProcess",
    handler: (pid: number) => treeKill(pid, "SIGINT"),
  },
  {
    command: "markdown.killProcess",
    handler: (pid: number) => treeKill(pid, "SIGKILL"),
  },
  { command: "markdown.killAllProcesses", handler: killAllChildProcesses },
];

// List of temporary files
export const tempFilePaths: string[] = [];

// For Java code blocks, the user needs to specify a filename
function getBaseName(language: string): Promise<string> {
  if (language === "java") {
    return new Promise<string>((resolve) => {
      vscode.window
        .showInputBox({
          prompt:
            "Enter the name of the Java file (without extension). " +
            "Note: The Java standard requires the filename to be the " +
            "same as the name of the main class.",
          placeHolder: "MyJavaFile",
        })
        .then((baseName) => {
          resolve(baseName || "");
        });
    });
  } else {
    return Promise.resolve(`temp_${Date.now()}`);
  }
}

// Inject the Python Path Code into Python Files
function injectPythonPath(language: string, code: string): string {
  // Read the Python Path configuration boolean
  const config = vscode.workspace.getConfiguration();
  const pythonPathEnabled = config.get<boolean>("markdownRunner.pythonPath");

  // If the boolean is true, inject the markdown file's path into the code
  const editor = vscode.window.activeTextEditor;
  if (pythonPathEnabled && editor && language === "python") {
    const documentDirectory = path.dirname(editor.document.uri.fsPath);
    code = `import sys\nsys.path.insert(0, r'${documentDirectory}')\n` + code;
  }

  return code;
}

// Save code to a temporary file and execute it
// For compiled languages, a child process is created for compilation additionally
// Return command string to be run in terminal or on markdown file as needed
export async function getRunCommand(
  language: string,
  code: string
): Promise<string> {
  const baseName = await getBaseName(language);
  if (!baseName) {
    return "";
  }
  const extension = getLanguageConfig(language, "extension");
  if (!extension) {
    return "";
  }
  const compiler = getLanguageConfig(language, "compiler");
  if (!compiler) {
    return "";
  }
  code = injectPythonPath(language, code);
  const basePath = path.join(os.tmpdir(), baseName);
  const sourcePath = `${basePath}.${extension}`;

  // Write code to a file, SECURITY: Only Owner Read and Write
  fs.writeFileSync(sourcePath, code, { mode: 0o600 });
  tempFilePaths.push(sourcePath);

  // Compilation for C, C++ and Rust
  if (language === "c" || language === "cpp" || language === "rust") {
    if (await compileHandler(`${compiler} -o ${basePath} ${sourcePath}`)) {
      tempFilePaths.push(basePath);
      return basePath;
    } else {
      return "";
    }
  }

  // Compilation for Java
  if (language === "java") {
    if (await compileHandler(`${compiler} ${sourcePath}`)) {
      tempFilePaths.push(`${basePath}.class`);
      return `java -cp ${os.tmpdir()} ${baseName}`;
    } else {
      return "";
    }
  }

  // If not a compiled language, then run it
  return `${compiler} ${sourcePath}`;
}

// Compiles a binary using the provided command
// Throws an error message if unsuccessful
function compileHandler(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    cp.exec(command, (error, stdout, stderr) => {
      if (error) {
        // Timeout is necessary because of interference with codelens
        setTimeout(() => {
          vscode.window.showErrorMessage(stderr, { modal: true });
        }, 100);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// Run command in the terminal
export function runInTerminal(code: string) {
  if (code === "") {
    return;
  }
  const terminal =
    vscode.window.activeTerminal || vscode.window.createTerminal();
  terminal.show();
  terminal.sendText(code);
}

// Used for `Run on Markdown`
export function findResultBlock(
  document: vscode.TextDocument,
  startLine: number
) {
  const regex: RegExp = /^```(.*?)\n(.*?)^```/gms;

  // Check if startLine is out of bounds
  if (startLine < 0 || startLine >= document.lineCount) {
    return null;
  }

  // Obtain the sliced document at `startLine`
  const fullText = document.getText();
  const startPos = document.lineAt(startLine).range.start;
  const startOffset = document.offsetAt(startPos);
  const slicedText = fullText.slice(startOffset);

  // Find first match within the sliced document
  const match = regex.exec(slicedText);
  if (!match) {
    return null;
  }

  // Parse and validate the data
  const { language, code } = parseBlock(document, match, regex);
  if (language !== `result`) {
    return null;
  }

  // The match must start a line away from startLine
  const matchIndex = match.index;
  const preMatchText = slicedText.slice(0, matchIndex);
  const relativeLineNumber = preMatchText.split("\n").length - 1;
  if (relativeLineNumber !== 1) {
    return null;
  }

  // The range of the contents inside the code block to get cleared
  const foundStartLine = startLine + relativeLineNumber + 1;
  const codeLineCount = code.split("\n").length;
  const foundEndLine = foundStartLine + codeLineCount - 1;
  return new vscode.Range(foundStartLine, 0, foundEndLine, 0);
}

// Run command on the markdown file
async function runOnMarkdown(code: string, range: vscode.Range) {
  if (code === "") {
    return;
  }

  // Do not support multiple output streams at the same time
  // TODO: maybe implement this in the future
  if (childProcesses.length > 0) {
    return;
  }

  // Calculate the range of Code Lens for the new child process
  const childLine = range.end.line + 2;
  const childRange = new vscode.Range(childLine, 0, childLine, 0);

  // If a process already exists at the same range, return
  const existingProcess = childProcesses.find((entry) =>
    entry.range.isEqual(childRange)
  );
  if (existingProcess) {
    return;
  }

  // Lock to make sure text insert or deletion happens atomically
  const textEditLock = new AsyncLock();

  // Obtain editor
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  // Create result block that holds execution results
  const deleteRange = findResultBlock(editor.document, range.end.line + 1);
  await textEditLock.acquire("key", async () => {
    // Critical section code here
    if (deleteRange) {
      // If result block found, clear the contents inside it
      await editor.edit((editBuilder) => {
        editBuilder.delete(deleteRange);
      });
    } else {
      // If result block not found, create it
      await insertText(editor, range.end, "\n\n```result\n```");
    }
  });

  // Start child process
  const runner = cp.spawn("sh", ["-c", code], { detached: true });

  // Create buttons to stop or kill the process
  childProcesses.push({ pid: runner.pid!, range: childRange });
  killAllButton.show();

  // Output results 3 lines below the parent code block
  let currentPosition = new vscode.Position(range.end.line + 3, 0);

  // Write child process execution results onto markdown file
  runner.stdout.on("data", async (data: Buffer) => {
    // Throttle write attempts
    await textEditLock.acquire("key", async () => {
      // Critical section code here
      const output = data.toString();
      await insertText(editor, currentPosition, output);
      const outputLines = output.split("\n");
      const newPositionLine = currentPosition.line + outputLines.length - 1;
      const lastLineLength = outputLines[outputLines.length - 1].length;
      currentPosition = new vscode.Position(newPositionLine, lastLineLength);
    });
  });

  runner.on("close", async () => {
    // Remove process `stop` and `kill` controls once done with the process
    const index = childProcesses.findIndex((entry) => entry.pid === runner.pid);
    if (index !== -1) {
      childProcesses.splice(index, 1);
    }
    if (childProcesses.length === 0) {
      killAllButton.hide();
    }

    // If output did not end on a newline, add it
    if (currentPosition.character !== 0) {
      await textEditLock.acquire("key", async () => {
        await insertText(editor, currentPosition, "\n");
      });
    }
  });
}

// Helper function to runOnMarkdown
async function insertText(
  editor: vscode.TextEditor,
  currentPosition: vscode.Position,
  insertedText: string
) {
  await editor
    .edit((editBuilder) => {
      editBuilder.insert(currentPosition, insertedText);
    })
    .then((success) => {
      if (success) {
        // Save the document to ensure undo-ability
        vscode.window.activeTextEditor?.document.save();
      }
    });
}

// Safety button to kill all processes
const killAllButton = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left
);
killAllButton.command = {
  title: "Kill All `Run on Markdown` Processes",
  command: "markdown.killAllProcesses",
  arguments: [],
};
killAllButton.text = "$(stop-circle) Kill All Processes";

// Kill All Button calls this function
function killAllChildProcesses() {
  childProcesses.forEach(({ pid }, i) => {
    treeKill(pid, "SIGKILL");
    childProcesses.splice(i, 1);
  });
}

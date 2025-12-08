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
import * as cp from "child_process";
import Mutex from "semaphore-async-await";
import { parseBlock, blockRegex } from "./codeLens";

// Global mutex to ensure all text insertion or deletion happens atomically
const textEditMutex = new Mutex(1);

// PIDs associated with `Run on Markdown` child processes
export let childProcesses: { pid: number; line: number }[] = [];

// Remove a child process from list
export function removeChild(pid: number | undefined) {
  childProcesses = childProcesses.filter((cp) => cp.pid !== pid);
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

// Used for `Run on Markdown`
function findResultBlock(document: vscode.TextDocument, startLine: number) {
  // Check if startLine is out of bounds
  if (startLine < 0 || startLine >= document.lineCount) return null;

  // Obtain the sliced document at `startLine`
  const startOffset = document.offsetAt(new vscode.Position(startLine, 0));
  const slicedText = document.getText().slice(startOffset);

  // Find first match for a result block within the sliced document
  const regex = new RegExp(blockRegex.source, blockRegex.flags);
  const match = regex.exec(slicedText);
  if (!match) return null;
  const { language, code } = parseBlock(document, match);
  if (language !== `result`) return null;

  // The match must be on the first line of the sliced document
  const matchLine = slicedText.slice(0, match.index).split("\n").length;
  if (matchLine !== 1) return null;

  // Return range of results contents to be cleared
  const endLine = startLine + 1 + code.split("\n").length - 1;
  return new vscode.Range(startLine + 1, 0, endLine, 0);
}

// Run command on the markdown file
export async function runOnMarkdown(code: string, range: vscode.Range) {
  // TODO: implement multiple output streams at the same time
  const editor = vscode.window.activeTextEditor;
  if (code === "" || childProcesses.length > 0 || !editor) return;

  // Mutex ensures result block exists before child process inserts
  const resultMutex = new Mutex(1);
  await resultMutex.acquire();

  // Start child process
  const child = cp.spawn(code, { shell: true });

  // Output child process results 3 lines below parent code block
  let outputPos = new vscode.Position(range.end.line + 3, 0);

  // Whenever child process outputs a new batch of data, write it
  child.stdout.on("data", async (data: Buffer) => {
    await resultMutex.acquire();
    await textEditMutex.acquire();

    const output = data.toString();
    await editor.edit((text) => text.insert(outputPos, output));
    const lines = output.split("\n");
    const last = lines[lines.length - 1];
    outputPos = new vscode.Position(
      outputPos.line + lines.length - 1,
      lines.length === 1 ? outputPos.character + last.length : last.length
    );

    resultMutex.release();
    textEditMutex.release();
  });

  // Runs when child process has finished writing all data
  child.stdout.on("end", async () => {
    await resultMutex.acquire();
    await textEditMutex.acquire();

    // If output did not end on a newline, add it
    if (outputPos.character !== 0)
      await editor.edit((text) => text.insert(outputPos, "\n"));

    // Save the document after all text deletes/inserts
    await editor.document.save();

    resultMutex.release();
    textEditMutex.release();
  });

  // Runs when child process exits (but not all data may be written)
  child.on("close", async () => {
    // Remove process `Stop` and `Kill` controls
    removeChild(child.pid);
    if (!childProcesses.length) killAllButton.hide();
  });

  // Create buttons to stop or kill the process
  if (child.pid != undefined) {
    childProcesses.push({ pid: child.pid, line: range.end.line + 2 });
    killAllButton.show();
  } else {
    vscode.window.showErrorMessage("Failed to start process.");
    resultMutex.release();
    return;
  }

  // Create result block that holds execution results
  await textEditMutex.acquire();
  const deleteRange = findResultBlock(editor.document, range.end.line + 2);

  // If result block found, clear the contents inside it, otherwise create it
  const resultBlock = "\n\n```result\n```";
  await editor.edit((text) =>
    deleteRange ? text.delete(deleteRange) : text.insert(range.end, resultBlock)
  );

  resultMutex.release();
  textEditMutex.release();
}

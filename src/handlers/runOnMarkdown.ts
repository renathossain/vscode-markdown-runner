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
import AsyncLock from "async-lock";
import { parseBlock, blockRegex } from "../codeLens";

// Lock to make sure text insert or deletion happens atomically
const textEditLock = new AsyncLock();

// PIDs associated with `Run on Markdown` child processes
export let childProcesses: { pid: number; line: number }[] = [];

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
  const match = blockRegex.exec(slicedText);
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

// Helper function to runOnMarkdown
async function insertText(
  editor: vscode.TextEditor,
  position: vscode.Position,
  text: string
) {
  await editor
    .edit((editBuilder) => editBuilder.insert(position, text))
    .then((success) => (success ? editor.document.save() : false));
}

// Run command on the markdown file
export async function runOnMarkdown(code: string, range: vscode.Range) {
  // TODO: implement multiple output streams at the same time
  const editor = vscode.window.activeTextEditor;
  if (code === "" || childProcesses.length > 0 || !editor) return;

  // Create result block that holds execution results
  await textEditLock.acquire("key", async () => {
    const deleteRange = findResultBlock(editor.document, range.end.line + 2);
    if (deleteRange)
      // If result block found, clear the contents inside it
      await editor.edit((editBuilder) => editBuilder.delete(deleteRange));
    else
      // If result block not found, create it
      await insertText(editor, range.end, "\n\n```result\n```");
  });

  // Start child process and create buttons to stop or kill the process
  const child = cp.spawn("sh", ["-c", code], { detached: true });
  childProcesses.push({ pid: child.pid!, line: range.end.line + 2 });
  killAllButton.show();

  // Output child process results 3 lines below parent code block
  let outputPosition = new vscode.Position(range.end.line + 3, 0);
  child.stdout.on("data", async (data: Buffer) => {
    await textEditLock.acquire("key", async () => {
      const output = data.toString();
      await insertText(editor, outputPosition, output);
      const outputLines = output.split("\n");
      const newPositionLine = outputPosition.line + outputLines.length - 1;
      const newPositionChar =
        (outputLines.length === 1 ? outputPosition.character : 0) +
        outputLines[outputLines.length - 1].length;
      outputPosition = new vscode.Position(newPositionLine, newPositionChar);
    });
  });

  child.on("close", async () => {
    // Remove process `stop` and `kill` controls once done with the process
    childProcesses = childProcesses.filter((p) => p.pid !== child.pid);
    if (!childProcesses.length) killAllButton.hide();

    // If output did not end on a newline, add it
    await textEditLock.acquire("key", async () => {
      if (outputPosition.character !== 0)
        await insertText(editor, outputPosition, "\n");
    });
  });
}

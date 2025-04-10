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
import { childProcesses, parseBlock, blockRegex } from "../codeLens";

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
  if (startLine < 0 || startLine >= document.lineCount) {
    return null;
  }

  // Obtain the sliced document at `startLine`
  const fullText = document.getText();
  const startPos = document.lineAt(startLine).range.start;
  const startOffset = document.offsetAt(startPos);
  const slicedText = fullText.slice(startOffset);

  // Find first match within the sliced document
  const match = blockRegex.exec(slicedText);
  if (!match) {
    return null;
  }

  // Parse and validate the data
  const { language, code } = parseBlock(document, match);
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

// Run command on the markdown file
export async function runOnMarkdown(code: string, range: vscode.Range) {
  // TODO: implement multiple output streams at the same time
  if (code === "" || childProcesses.length > 0) {
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

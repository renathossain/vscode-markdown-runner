// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

// Spawns child processes and streams their output into the document as fenced
// ```output blocks. Provides lifecycle management: Delete, Kill, Kill All.

import * as vscode from "vscode";
import * as childProcess from "child_process";
import iconv from "iconv-lite";
import Mutex from "semaphore-async-await";
import treeKill from "tree-kill";
import { parseBlock, blockRegex } from "./codeLens";
import { codeLensProvider } from "./extension";

// Global mutex ensuring only one edit operation (delete or run) is in flight
// at a time, preventing interleaved writes to the document.
const textEditMutex = new Mutex(1);

// Tracks active child PIDs and the document line where their output starts
// (used by codeLens.ts to place Stop/Kill buttons).
export let childProcesses: { pid: number; line: number }[] = [];

// Status bar button to kill all running output processes at once.
const killAllButton = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left,
);
killAllButton.command = {
  title: "Kill All `Run on Markdown` Processes",
  command: "markdown.killAllProcesses",
};
killAllButton.text = "$(stop-circle) Kill All Processes";

// Delete text in a range (Clear / Delete CodeLens). Acquires textEditMutex to
// avoid racing with an active output stream. Silently skips if mutex is busy.
export async function deleteOnMarkdown(range: vscode.Range) {
  if (!textEditMutex.tryAcquire()) return;
  const editor = vscode.window.activeTextEditor;
  if (await editor?.edit((text) => text.delete(range)))
    await editor?.document.save();
  codeLensProvider?.refresh();
  textEditMutex.release();
}

// Starting from startLine, check if the first fenced code block is an ``output``
// block. If so, return the range of its content (excluding the fences). Returns
// null if no matching block is found or it is not immediately adjacent.
function findOutputBlock(document: vscode.TextDocument, startLine: number) {
  if (startLine < 0 || startLine >= document.lineCount) return null;

  const startOffset = document.offsetAt(new vscode.Position(startLine, 0));
  const slicedText = document.getText().slice(startOffset);

  const match = blockRegex().exec(slicedText);
  if (!match) return null;
  const { language, code } = parseBlock(document, match);
  if (language !== "output") return null;

  const matchLine = slicedText.slice(0, match.index).split("\n").length;
  if (matchLine !== 1) return null;

  const endLine = startLine + code.split("\n").length;
  return new vscode.Range(startLine + 1, 0, endLine, 0);
}

// Spawn a child process and stream its stdout/stderr into a ``output`` fenced
// block below the source code block. Returns { pid, done } where done resolves
// when the process exits and all output has been written.
export function runOnMarkdown(command: string, range: vscode.Range) {
  const failed = { pid: -1, done: async () => {} };
  const editor = vscode.window.activeTextEditor;
  if (!command || !editor || !textEditMutex.tryAcquire()) return failed;

  const encoding = vscode.workspace
    .getConfiguration()
    .get<string>("markdownRunner.outputEncoding", "utf8");

  if (!iconv.encodingExists(encoding)) {
    const errorMessage = `Invalid output encoding "${encoding}". See https://github.com/pillarjs/iconv-lite/wiki/Supported-Encodings`;
    vscode.window.showErrorMessage(errorMessage);
    textEditMutex.release();
    return failed;
  }

  const child = childProcess.spawn(command, { shell: true });
  if (child.pid == null) {
    vscode.window.showErrorMessage("Failed to start process.");
    textEditMutex.release();
    return failed;
  }

  childProcesses.push({ pid: child.pid, line: range.end.line + 2 });
  killAllButton.show();

  // Orchestrates all output writing and cleanup. Three mutexes coordinate the
  // async pipeline: outputMutex serialises edits, exitMutex waits for the
  // process to exit, endMutex waits for the stdout stream to close.
  const done = (async () => {
    const outputMutex = new Mutex(1);
    await outputMutex.acquire();

    const exitMutex = new Mutex(1);
    await exitMutex.acquire();

    const endMutex = new Mutex(1);
    await endMutex.acquire();

    let outputPos = new vscode.Position(range.end.line + 3, 0);

    // Decode a data chunk and insert it at the current output position.
    const writer = async (data: Buffer) => {
      await outputMutex.acquire();

      const output = iconv.decode(data, encoding);
      await editor.edit((text) => text.insert(outputPos, output));
      const lines = output.split("\n");
      const last = lines[lines.length - 1];
      outputPos = new vscode.Position(
        outputPos.line + lines.length - 1,
        lines.length === 1 ? outputPos.character + last.length : last.length,
      );

      outputMutex.release();
    };

    child.stdout.on("data", writer);
    child.stderr.on("data", writer);

    child.on("exit", async () => {
      childProcesses = childProcesses.filter(({ pid }) => pid !== child.pid);
      if (!childProcesses.length) killAllButton.hide();

      exitMutex.release();
    });

    child.stdout.on("end", async () => {
      await outputMutex.acquire();

      if (outputPos.character !== 0)
        await editor.edit((text) => text.insert(outputPos, "\n"));

      await editor.document.save();

      outputMutex.release();
      endMutex.release();
    });

    // Delete any existing output block for this code block, or insert a new
    // ``output`` fence header if none exists.
    const deleteRange = findOutputBlock(editor.document, range.end.line + 2);
    await editor.edit((text) =>
      deleteRange
        ? text.delete(deleteRange)
        : text.insert(range.end, "\n\n```output\n```"),
    );

    outputMutex.release();
    await exitMutex.acquire();
    await endMutex.acquire();

    codeLensProvider?.refresh();

    textEditMutex.release();
    exitMutex.release();
    endMutex.release();
  })();

  return { pid: child.pid, done };
}

// Remove a PID from tracking and kill it with the given signal.
export async function killProcess(pid: number, signal: string) {
  childProcesses = childProcesses.filter((process) => process.pid !== pid);
  treeKill(pid, signal);
}

// Clear all tracked PIDs and kill every process with SIGKILL.
export async function killAllProcesses() {
  const processes = childProcesses;
  childProcesses = [];
  processes.forEach(({ pid }) => treeKill(pid, "SIGKILL"));
}

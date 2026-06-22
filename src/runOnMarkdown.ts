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
import { Terminal } from "@xterm/xterm";

// Global mutex ensuring only one edit operation (delete or run) is in flight
// at a time, preventing interleaved writes to the document.
const textEditMutex = new Mutex(1);

// Tracks active child PIDs and the document line where their output starts
// (used by codeLens.ts to place Stop/Kill buttons).
export let childProcesses: { pid: number; line: number }[] = [];

// Status bar button to kill all running output processes at once.
const killAlign = vscode.StatusBarAlignment.Left;
const killAllButton = vscode.window.createStatusBarItem(killAlign);
killAllButton.command = {
  title: "Kill All `Run on Markdown` Processes",
  command: "markdown.killAllProcesses",
};
killAllButton.text = "$(stop-circle) Kill All Processes";

// Delete text in a range (Clear / Delete CodeLens). Acquires textEditMutex to
// avoid racing with an active output stream. Silently skips if mutex is busy.
export async function deleteOnMarkdown(
  range: vscode.Range,
  editor: vscode.TextEditor,
) {
  if (!textEditMutex.tryAcquire()) return;
  if (await editor.edit((text) => text.delete(range)))
    await editor.document.save();
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
  const { lang, code } = parseBlock(document, match);
  if (lang !== "output") return null;

  if (slicedText.slice(0, match.index).split("\n").length !== 1) return null;

  const endLine = startLine + code.split("\n").length;
  return new vscode.Range(startLine + 1, 0, endLine, 0);
}

// Spawn a child process and stream its stdout/stderr into a ``output`` fenced
// block below the source code block. Returns { pid, done } where done resolves
// when the process exits and all output has been written.
export function runOnMarkdown(
  command: string,
  range: vscode.Range,
  editor: vscode.TextEditor,
) {
  const failed = { pid: -1, done: async () => {} };
  if (!command || !editor || !textEditMutex.tryAcquire()) return failed;

  const document = editor.document;
  const indent =
    document.lineAt(range.start.line).text.match(/^[ \t]*/)?.[0] ?? "";
  const config = vscode.workspace.getConfiguration();
  const encoding = config.get<string>("markdownRunner.outputEncoding", "utf8");
  const { cols, rows } = config.get<{ cols: number; rows: number }>(
    "markdownRunner.terminalDimensions",
    { cols: 1000, rows: 1000 },
  );

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
    const exitMutex = new Mutex(0);
    const endMutex = new Mutex(0);

    const term = new Terminal({ cols, rows, convertEol: true });

    // Read back the terminal buffer as plain text (all ANSI processed).
    const getTerminalText = (): string => {
      const lines: string[] = [];
      for (let y = 0; y < term.buffer.active.length; y++) {
        const line = term.buffer.active.getLine(y);
        if (line) lines.push(line.translateToString(true));
      }
      while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
      return lines.length > 0 ? lines.join("\n") + "\n" : "";
    };

    // Decode a data chunk, let the virtual terminal process any ANSI sequences,
    // then replace the output block content with the rendered result.
    // The output block is indented to match the source code block's fence line.
    const writer = async (data: Buffer) => {
      await outputMutex.acquire();
      const decoded = iconv.decode(data, encoding);
      await new Promise<void>((resolve) => term.write(decoded, resolve));
      const content = getTerminalText();
      const indentedContent = indent
        ? content.replace(/^.*$/gm, (l) => (l ? indent + l : l))
        : content;
      const deleteRange = findOutputBlock(document, range.end.line + 2);
      console.log(deleteRange);
      const outputBlock = `\n\n${indent}\`\`\`output\n${indentedContent}${indent}\`\`\``;
      const edit = new vscode.WorkspaceEdit();
      if (deleteRange) {
        edit.delete(document.uri, deleteRange);
        edit.insert(document.uri, deleteRange.start, indentedContent);
      } else edit.insert(document.uri, range.end, outputBlock);
      await vscode.workspace.applyEdit(edit);
      outputMutex.release();
    };

    child.stdout.on("data", writer);
    child.stderr.on("data", writer);

    child.on("exit", () => {
      childProcesses = childProcesses.filter(({ pid }) => pid !== child.pid);
      if (!childProcesses.length) killAllButton.hide();
      exitMutex.release();
    });

    child.stdout.on("end", async () => {
      await outputMutex.acquire();
      await document.save();
      outputMutex.release();
      endMutex.release();
    });

    // Create an empty output block (or clear an existing one) as soon as the
    // child process starts
    await outputMutex.acquire();
    const existing = findOutputBlock(document, range.end.line + 2);
    const edit = new vscode.WorkspaceEdit();
    if (existing) edit.delete(document.uri, existing);
    else
      edit.insert(
        document.uri,
        range.end,
        `\n\n${indent}\`\`\`output\n${indent}\`\`\``,
      );
    await vscode.workspace.applyEdit(edit);
    outputMutex.release();

    await exitMutex.acquire();
    await endMutex.acquire();
    codeLensProvider?.refresh();
    textEditMutex.release();
  })();

  return { pid: child.pid, done };
}

// Remove a PID from tracking and kill it with the given signal.
export async function killProcess(pid: number, signal: string) {
  childProcesses = childProcesses.filter((process) => process.pid !== pid);
  treeKill(pid, signal);
}

// Clear all tracked PIDs and kill every process with SIGKILL.
export const killAllProcesses = () =>
  childProcesses.splice(0).forEach(({ pid }) => treeKill(pid, "SIGKILL"));

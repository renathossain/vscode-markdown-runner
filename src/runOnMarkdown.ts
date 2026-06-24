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
export let childProcesses: {
  pid: number;
  docUri: vscode.Uri;
}[] = [];

// Global mutex ensuring only one process is modifying the childProcesses
// datastructure at a time.
const childProcessesMutex = new Mutex(1);

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
  docUri: vscode.Uri,
) {
  if (!textEditMutex.tryAcquire()) return;
  const edit = new vscode.WorkspaceEdit();
  edit.delete(docUri, range);
  await vscode.workspace.applyEdit(edit);
  await (await vscode.workspace.openTextDocument(docUri)).save();
  codeLensProvider?.refresh();
  textEditMutex.release();
}

// Starting from startLine, check if the first fenced code block is an ``output``
// block whose indentation matches `indent`. If so, return the range of its
// content (excluding the fences). Returns null if no matching block is found
// or it is not immediately adjacent.
function findOutputBlock(
  document: vscode.TextDocument,
  pid: number,
  indent: string,
) {
  for (const match of document.getText().matchAll(blockRegex())) {
    const block = parseBlock(document, match);
    if (block.lang !== "output" || !block.pid) continue;
    if (block.pid !== pid) continue;
    const blockIndent = match[0].match(/^[ \t]*/)?.[0] ?? "";
    if (blockIndent !== indent) continue;
    const codeStart = block.range.start.line + 1;
    return new vscode.Range(codeStart, 0, block.range.end.line, 0);
  }
  return null;
}

// Spawn a child process and stream its stdout/stderr into a ``output`` fenced
// block below the source code block. Returns { pid, done } where done resolves
// when the process exits and all output has been written.
export function runOnMarkdown(
  command: string,
  range: vscode.Range,
  docUri: vscode.Uri,
) {
  const failed = { pid: -1, done: async () => {} };
  if (!command || !docUri || !textEditMutex.tryAcquire()) return failed;

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
  if (!child.pid) {
    vscode.window.showErrorMessage("Failed to start process.");
    textEditMutex.release();
    return failed;
  }
  const childPid = child.pid;

  // Orchestrates all output writing and cleanup. Three mutexes coordinate the
  // async pipeline: outputMutex serialises edits, exitMutex waits for the
  // process to exit, endMutex waits for the stdout stream to close.
  const done = (async () => {
    await childProcessesMutex.acquire();
    childProcesses.push({ pid: childPid, docUri });
    killAllButton.show();
    childProcessesMutex.release();

    const outputMutex = new Mutex(1);
    const exitMutex = new Mutex(0);
    const endMutex = new Mutex(0);

    const doc = await vscode.workspace.openTextDocument(docUri);
    const indent =
      doc.lineAt(range.start.line).text.match(/^[ \t]*/)?.[0] ?? "";
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
      const outputDoc = await vscode.workspace.openTextDocument(docUri);
      const deleteRange = findOutputBlock(outputDoc, childPid, indent);
      const outputBlock = `\n\n${indent}\`\`\`output pid_${childPid}\n${indentedContent}${indent}\`\`\``;
      const edit = new vscode.WorkspaceEdit();
      if (deleteRange) {
        edit.delete(docUri, deleteRange);
        edit.insert(docUri, deleteRange.start, indentedContent);
      } else edit.insert(docUri, range.end, outputBlock);
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
      await (await vscode.workspace.openTextDocument(docUri)).save();
      outputMutex.release();
      endMutex.release();
    });

    // Create an empty output block (or clear an existing one) as soon as the
    // child process starts
    await outputMutex.acquire();
    const outputDoc = await vscode.workspace.openTextDocument(docUri);
    const existing = findOutputBlock(outputDoc, childPid, indent);
    const emptyBlock = `\n\n${indent}\`\`\`output pid_${childPid}\n${indent}\`\`\``;
    const edit = new vscode.WorkspaceEdit();
    if (existing) edit.delete(docUri, existing);
    else edit.insert(docUri, range.end, emptyBlock);
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
  await childProcessesMutex.acquire();
  childProcesses = childProcesses.filter((p) => p.pid !== pid);
  treeKill(pid, signal);
  childProcessesMutex.release();
}

// Clear all tracked PIDs and kill every process with SIGKILL.
export async function killAllProcesses() {
  await childProcessesMutex.acquire();
  childProcesses.splice(0).forEach(({ pid }) => treeKill(pid, "SIGKILL"));
  childProcessesMutex.release();
}

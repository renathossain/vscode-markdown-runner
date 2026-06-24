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
import { CodeBlock, codeLensProvider, getCurrentBlock } from "./extension";
import { Terminal } from "@xterm/xterm";

// Global mutex ensuring only one edit operation (delete or run) is in flight
// at a time, preventing interleaved writes to the document.
const textEditMutex = new Mutex(1);

// Combined refresh + release for use after edit operations.
const refreshAndRelease = () =>
  void (codeLensProvider?.refresh(), textEditMutex.release());

// Tracks active child PIDs and the document line where their output starts
// (used by codeLens.ts to place Stop/Kill buttons).
export let childProcesses: { pid: number; docUri: vscode.Uri }[] = [];

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
export async function deleteBlock(block: CodeBlock, range: vscode.Range) {
  await textEditMutex.acquire();
  const edit = new vscode.WorkspaceEdit();
  edit.delete(block.docUri, range);
  await vscode.workspace.applyEdit(edit);
  await (await vscode.workspace.openTextDocument(block.docUri)).save();
  refreshAndRelease();
}

// Starting from startLine, check if the first fenced code block is an ``output``
// block whose indentation matches `indent`. If so, return the range of its
// content (excluding the fences). Returns null if no matching block is found
// or it is not immediately adjacent.
function findOutputBlock(
  document: vscode.TextDocument,
  pid: number,
  indent: string,
  range: vscode.Range,
) {
  for (const match of document.getText().matchAll(blockRegex())) {
    const block = parseBlock(document, match);
    if (block.lang !== "output" || block.pid !== pid) continue;
    const blockIndent = match[0].match(/^[ \t]*/)?.[0] ?? "";
    if (blockIndent !== indent) continue;
    const gap = block.range.start.line - range.end.line;
    if (pid === -1 && gap !== 2) continue;
    return block;
  }
  return null;
}

// Spawn a child process and stream its stdout/stderr into a ``output`` fenced
// block below the source code block. Returns { pid, done } where done resolves
// when the process exits and all output has been written.
export function runOnMarkdown(block: CodeBlock, command: string) {
  const { docUri, range } = block;
  const failed = { pid: -1, done: async () => {} };
  if (!command || !docUri) return failed;

  const config = vscode.workspace.getConfiguration();
  const encoding = config.get<string>("markdownRunner.outputEncoding", "utf8");
  const { cols, rows } = config.get<{ cols: number; rows: number }>(
    "markdownRunner.terminalDimensions",
    { cols: 1000, rows: 1000 },
  );

  if (!iconv.encodingExists(encoding)) {
    const errorMessage = `Invalid output encoding "${encoding}". See https://github.com/pillarjs/iconv-lite/wiki/Supported-Encodings`;
    vscode.window.showErrorMessage(errorMessage);
    return failed;
  }

  const child = childProcess.spawn(command, { shell: true });
  if (!child.pid)
    return (vscode.window.showErrorMessage("Failed to start process."), failed);
  childProcesses.push({ pid: child.pid, docUri });
  killAllButton.show();

  // Orchestrates all output writing and cleanup. Three mutexes coordinate the
  // async pipeline: outputMutex serialises edits, exitMutex waits for the
  // process to exit, endMutex waits for the stdout stream to close.
  const done = (async () => {
    const exitMutex = new Mutex(0);
    const endMutex = new Mutex(0);
    let indent = "";

    // Terminal buffer for ANSI processing
    const term = new Terminal({ cols, rows, convertEol: true });

    // Decode a data chunk, let the virtual terminal process any ANSI sequences,
    // then replace the output block content with the rendered result.
    // The output block is indented to match the source code block's fence line.
    const writer = async (data: Buffer) => {
      await textEditMutex.acquire();
      const decoded = iconv.decode(data, encoding);
      await new Promise<void>((resolve) => term.write(decoded, resolve));
      const lines: string[] = [];
      for (let y = 0; y < term.buffer.active.length; y++)
        lines.push(term.buffer.active.getLine(y)!.translateToString(true));
      while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
      const content = lines.length > 0 ? lines.join("\n") + "\n" : "";
      const indentedContent = indent
        ? content.replace(/^.*$/gm, (l) => (l ? indent + l : l))
        : content;
      const textDoc = await vscode.workspace.openTextDocument(docUri);
      const outputBlock = findOutputBlock(textDoc, child.pid!, indent, range);
      const outputStr = `\n\n${indent}\`\`\`output pid_${child.pid}\n${indentedContent}${indent}\`\`\``;
      const edit = new vscode.WorkspaceEdit();
      if (outputBlock) {
        const deleteStart = outputBlock.range.start.line + 1;
        const deleteEnd = outputBlock.range.end.line;
        const deleteRange = new vscode.Range(deleteStart, 0, deleteEnd, 0);
        edit.delete(docUri, deleteRange);
        edit.insert(docUri, deleteRange.start, indentedContent);
      } else edit.insert(docUri, range.end, outputStr);
      await vscode.workspace.applyEdit(edit);
      refreshAndRelease();
    };

    child.stdout.on("data", writer);
    child.stderr.on("data", writer);

    child.on("exit", () => {
      childProcesses = childProcesses.filter(({ pid }) => pid !== child.pid);
      if (!childProcesses.length) killAllButton.hide();
      exitMutex.release();
    });

    child.stdout.on("end", async () => {
      await textEditMutex.acquire();
      const textDoc = await vscode.workspace.openTextDocument(docUri);
      const outputBlock = findOutputBlock(textDoc, child.pid!, indent, range);
      if (outputBlock) {
        const tagRange = textDoc.lineAt(outputBlock.range.start.line).range;
        const edit = new vscode.WorkspaceEdit();
        edit.replace(docUri, tagRange, `\`\`\`output`);
        await vscode.workspace.applyEdit(edit);
      }
      await textDoc.save();
      refreshAndRelease();
      endMutex.release();
    });

    // Create an empty output block (or clear an existing one) as soon as the
    // child process starts
    await textEditMutex.acquire();
    const textDoc = await vscode.workspace.openTextDocument(docUri);
    indent = textDoc.lineAt(range.start.line).text.match(/^[ \t]*/)?.[0] ?? "";
    const outputBlock = findOutputBlock(textDoc, -1, indent, range);
    const outputStr = `\n\n${indent}\`\`\`output pid_${child.pid}\n${indent}\`\`\``;
    const edit = new vscode.WorkspaceEdit();
    if (outputBlock) {
      const outStart = outputBlock.range.start.line + 1;
      const outEnd = outputBlock.range.end.line;
      edit.delete(docUri, new vscode.Range(outStart, 0, outEnd, 0));
      const outTag = textDoc.lineAt(outStart - 1);
      edit.insert(docUri, outTag.range.end, ` pid_${child.pid}`);
    } else edit.insert(docUri, range.end, outputStr);
    await vscode.workspace.applyEdit(edit);
    refreshAndRelease();

    void (await exitMutex.acquire(), await endMutex.acquire());
  })();

  return { pid: child.pid, done };
}

// Remove a PID from tracking and kill it with the given signal.
export async function killProcess(parsed?: CodeBlock, signal?: string) {
  const block = parsed ?? getCurrentBlock();
  if (!block) return;
  childProcesses = childProcesses.filter(
    (p) => p.pid !== block.pid || p.docUri !== block.docUri,
  );
  if (block.pid !== -1) treeKill(block.pid, signal ?? "SIGINT");
}

// Clear all tracked PIDs and kill every process with SIGKILL.
export const killAllProcesses = async () =>
  childProcesses.splice(0).forEach(({ pid }) => treeKill(pid, "SIGKILL"));

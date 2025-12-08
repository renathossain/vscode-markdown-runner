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
import { getLanguageConfig } from "./settings";
import { childProcesses } from "./runOnMarkdown";

// Regex to parse blocks delimited with at least 3 ticks `:
// (`{3,}) matches at 3 or more backticks ` (first capturing group)
// \1$ ensures that the closing backticks match the same length as the opening ones
// . matches any character, so .* matches any number of any characters
// .*? matches lazily (least amount of char to satisfy the regex),
// Without ?, it matches greedily by default (max chars to satisfy regex)
// (.*?)\n(.*?) - the brackets the denote the individual "capturing groups" (2 of them)
// The second capturing group captures the code block type (e.g. python, rust, etc.)
// The third capturing group captures the code itself
// Flags: g searches the text globally (all occurrences)
// Flags: m makes the ^ match the start of a line (by default it is start of the text)
// m and ^ ensures the codeblock delims ``` always start at the beginning of the line
// Flags: s makes the . match newline characters as well (by default it does not)
export const blockRegex = () => /^(`{3,})(.*?)\n(.*?)^\1$/gms;

// Parses blocks
export function parseBlock(
  document: vscode.TextDocument,
  match: RegExpExecArray
) {
  const parsedLang = match[2].trim().toLowerCase();
  const language = parsedLang === "" ? "bash" : parsedLang; // Treat untitled blocks as bash files
  const code = match[3];
  const start = document.positionAt(match.index);
  const end = document.positionAt(match.index + match[0].length);
  const range = new vscode.Range(start, end);
  return { language, code, range };
}

// Generate the code lens with the required parameters and push it to the list
function pushCodeLens(
  lenses: vscode.CodeLens[],
  range: vscode.Range,
  title: string,
  command: string,
  args: unknown[]
) {
  lenses.push(new vscode.CodeLens(range, { title, command, arguments: args }));
}

// Implementation for ButtonCodeLensProvider
function provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
  const lenses: vscode.CodeLens[] = [];

  // Generate buttons to stop `Run on Markdown` processes
  for (const { pid, line } of childProcesses) {
    const range = new vscode.Range(line, 0, line, 0);
    const argsStop = [pid, "SIGINT"];
    const argsKill = [pid, "SIGKILL"];
    pushCodeLens(lenses, range, `Stop`, `markdown.killProcess`, argsStop);
    pushCodeLens(lenses, range, `Kill`, `markdown.killProcess`, argsKill);
  }

  // Loop through all parsed code blocks and generate buttons
  for (const match of document.getText().matchAll(blockRegex())) {
    const { language, code, range } = parseBlock(document, match);
    const name = getLanguageConfig(language, `name`);

    // For all supported languages, provide options to run the code block
    if (name !== undefined) {
      // Provide `Run {Language} Block` option
      const titleRun = `Run ${name} Block`;
      const commandRun = `markdown.runFile`;
      const argsRun = [language, code];
      pushCodeLens(lenses, range, titleRun, commandRun, argsRun);

      // Only for bash code blocks, provide `Run in Terminal (line by line)` option
      const titleBash = `Run in Terminal`;
      const commandBash = `markdown.runInTerminal`;
      if (language === `bash` || language === `powershell`)
        pushCodeLens(lenses, range, titleBash, commandBash, [code]);

      // Provide `Run on Markdown` option
      const titleMark = `Run on Markdown`;
      const commandMark = `markdown.runOnMarkdown`;
      const argsMark = [language, code, range];
      pushCodeLens(lenses, range, titleMark, commandMark, argsMark);
    }

    // Always provide buttons to copy, clear or delete code blocks
    pushCodeLens(lenses, range, `Copy`, `markdown.copy`, [code]);
    const clr = new vscode.Range(range.start.line + 1, 0, range.end.line, 0);
    pushCodeLens(lenses, range, `Clear`, `markdown.delete`, [clr]);
    const del = new vscode.Range(range.start.line, 0, range.end.line + 1, 0);
    pushCodeLens(lenses, range, `Delete`, `markdown.delete`, [del]);
  }

  return lenses;
}

// CodeLens buttons provider for parsed code blocks
export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses = provideCodeLenses;
}

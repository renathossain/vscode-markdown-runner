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
import { childProcesses } from "./handlers/runOnMarkdown";

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
export const blockRegex: RegExp = /^(`{3,})(.*?)\n(.*?)^\1$/gms;

// Parses blocks
export function parseBlock(
  document: vscode.TextDocument,
  match: RegExpExecArray
) {
  const parsedLang = match[2].trim().toLowerCase();
  // Treat untitled blocks as bash files
  const language = parsedLang === "" ? "bash" : parsedLang;
  const code = match[3];
  const start = document.positionAt(match.index);
  const end = document.positionAt(match.index + match[0].length);
  const range = new vscode.Range(start, end);
  return { language, code, range };
}

// Parses code blocks
// This is a generator function that yields language, code, range
function* parseCodeBlocks(
  document: vscode.TextDocument
): Generator<{ language: string; code: string; range: vscode.Range }> {
  let match;
  while ((match = blockRegex.exec(document.getText())) !== null)
    yield parseBlock(document, match);
}

// Generate the code lens with the required parameters and push it to the list
function pushCodeLens(
  codeLenses: vscode.CodeLens[],
  range: vscode.Range,
  title: string,
  command: string,
  args: unknown[]
) {
  codeLenses.push(
    new vscode.CodeLens(range, { title, command, arguments: args })
  );
}

// CodeLens buttons provider for parsed code blocks
export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    // Generate buttons to stop `Run on Markdown` processes
    for (const { pid, line } of childProcesses) {
      const range = new vscode.Range(line, 0, line, 0);
      pushCodeLens(codeLenses, range, `Stop`, `markdown.killProcess`, [
        pid,
        "SIGINT",
      ]);
      pushCodeLens(codeLenses, range, `Kill`, `markdown.killProcess`, [
        pid,
        "SIGKILL",
      ]);
    }

    // Loop through all parsed code blocks and generate buttons
    for (const { language, code, range } of parseCodeBlocks(document)) {
      const langName = getLanguageConfig(language, `name`);

      // For all supported languages, provide options to run the code block
      if (langName !== undefined) {
        pushCodeLens(
          codeLenses,
          range,
          `Run ${langName} Block`,
          `markdown.runFile`,
          [language, code]
        );
        // Only for bash code blocks, provide `Run in Terminal (line by line)` option
        if (language === `bash`)
          pushCodeLens(
            codeLenses,
            range,
            `Run in Terminal`,
            `markdown.runInTerminal`,
            [code]
          );
        pushCodeLens(
          codeLenses,
          range,
          `Run on Markdown`,
          `markdown.runOnMarkdown`,
          [language, code, range]
        );
      }

      // Always provide buttons to copy, clear or delete code blocks
      pushCodeLens(codeLenses, range, `Copy`, `markdown.copy`, [code]);
      const clr = new vscode.Range(range.start.line + 1, 0, range.end.line, 0);
      pushCodeLens(codeLenses, range, `Clear`, `markdown.delete`, [clr]);
      const del = new vscode.Range(range.start.line, 0, range.end.line + 1, 0);
      pushCodeLens(codeLenses, range, `Delete`, `markdown.delete`, [del]);
    }

    return codeLenses;
  }
}

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

// Test out the regex here: https://regexr.com/

// Helper Function
export function parseBlock(
  document: vscode.TextDocument,
  match: RegExpExecArray,
  regex: RegExp
) {
  // match[0] captures the entire code block (we do not need it)
  const parsedLang = match[1].trim().toLowerCase(); // First capturing group of (.*?)\n(.*?)
  const language = parsedLang === "" ? "bash" : parsedLang; // Treat untitled blocks as bash files
  const code = match[2]; // Second capturing group of (.*?)\n(.*?)
  const start = document.positionAt(match.index); // Start position of the match in the document
  const end = document.positionAt(regex.lastIndex); // End position after the match
  const range = new vscode.Range(start, end);
  return { language, code, range };
}

// Parses out any code blocks (code within ``` delimiters) in the text of a markdown document
// This is a generator function that yields the line number, language and code of each code block
export function* parseCodeBlocks(
  document: vscode.TextDocument
): Generator<{ language: string; code: string; range: vscode.Range }> {
  // Explanation of regex:
  // . matches any character, so .* matches any number of any characters
  // .*? makes the behaviour lazy (matches the least amount of char to satisfy the regex)
  // If ? is not done, and there are multiple code blocks, it will match all the
  // code blocks as one code block (greedy, as opposed to lazy)
  // (.*?)\n(.*?) - the brackets the denote the individual "capturing groups" (2 of them)
  // The first capturing group captures the code block type (e.g. python, rust, etc.)
  // The second capturing group captures the code itself
  // Flags: g searches the text globally (all occurrences)
  // Flags: m makes the ^ match the start of a line (by default it is start of the text)
  // The m flag and ^ ensures the codeblock delims ``` always start at the beginning of the line
  // Flags: s makes the . match newline characters as well (by default it does not)
  const regex: RegExp = /^```(.*?)\n(.*?)^```/gms;

  // Loop through all matches and yield them
  let match;
  while ((match = regex.exec(document.getText())) !== null) {
    yield parseBlock(document, match, regex);
  }
}

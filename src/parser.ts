// vscode-markdown-runner
// Copyright (C) 2024 Renat Hossain

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

import * as vscode from 'vscode';

// Test out the regex here: https://regexr.com/

// Helper Function
function parseBlock(document: vscode.TextDocument, match: RegExpExecArray, regex: RegExp) {
    // match[0] captures the entire code block (we dont need it)
    const parsedLang = match[1].trim().toLowerCase(); // First capturing group of (.*?)\n(.*?)
    const language = parsedLang === '' ? 'bash' : parsedLang; // Treat untitled blocks as bash files
    const code = match[2]; // Second capturing group of (.*?)\n(.*?)
    const start = document.positionAt(match.index); // Start position of the match in the document
    const end = document.positionAt(regex.lastIndex); // End position after the match
    const range = new vscode.Range(start, end);
    return { language, code, range };
}

// Parses out any code blocks (code within ``` delimiters) in the text of a markdown document
// This is a generator function that yields the line number, language and code of each code block
export function* parseCodeBlocks(document: vscode.TextDocument): Generator<{ language: string, code: string, range: vscode.Range }> {
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

// Used for `Run on Markdown`
export function findResultBlock(document: vscode.TextDocument, startLine: number) {
    const regex: RegExp = /^```(.*?)\n(.*?)^```/gms;
    
    // Obtain the sliced document at `startLine`
    const fullText = document.getText();
    const startPos = document.lineAt(startLine).range.start;
    const startOffset = document.offsetAt(startPos);
    const slicedText = fullText.slice(startOffset);

    // Find first match within the sliced document
    const match = regex.exec(slicedText);
    if (!match) { return null; }

    // Parse and validate the data
    const { language, code } = parseBlock(document, match, regex);
    if (language !== `result`) { return null; }

    // The match must start a line away from startLine
    const matchIndex = match.index;
    const preMatchText = slicedText.slice(0, matchIndex);
    const relativeLineNumber = preMatchText.split('\n').length - 1;
    if (relativeLineNumber !== 1) { return null; }

    // The range of the contents inside the code block to get cleared
    const foundStartLine = startLine + relativeLineNumber + 1;
    const codeLineCount = code.split('\n').length;
    const foundEndLine = foundStartLine + codeLineCount - 1;
    return new vscode.Range(foundStartLine, 0, foundEndLine, 0);
}

// Parses out any inline code (code within ` delimiters)
// This is a generator function that yields the code of each code block
export function* parseInlineCode(document: vscode.TextDocument): Generator<{ code: string, range: vscode.Range }> {
    // Explanation of regex:
    // [^`\n] means match all any character that is not ` or \n (negated class)
    // ([^`\n]+?) capturing group will then match one or more of that class
    // It will also do so lazily, and not greedily because of the ?
    // Thus, `([^`\n]+?)` effectively matches an inline code block, with the
    // capturing group matching the code itself (non ` or \n characters)
    // Finally, we add some extra validation using look ahead and look behind:
    // (?<!`+) means negative look behind of at least one `
    // (?!`+) means negative look ahead of at least one `
    // This means that if there are multiple consecutive ` before and/or after
    // the code block, then we reject it.
    const regex: RegExp = /(?<!`+)`([^`\n]+?)`(?!`+)/g;

    // Loop through all matches and yield them
    let match;
    while ((match = regex.exec(document.getText())) !== null) {
        // match[0] captures the entire code block (we dont need it)
        const code = match[1]; // First capturing group ([^`\n]+?)
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos); // Used to properly place the link
        yield { code, range };
    }
}

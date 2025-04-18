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

// ******************************ARCHITECTURE******************************
//
//                               extension.ts
//                                    |
//                       +------------+-------------+
//                       |            |             |
//                 codeLinks.ts  codeLens.ts     handlers
//                                  |               |
//                                  |       +------------------+
//                                  |       |                  |
//                                  | runInTerminal.ts   runOnMarkdown.ts
//                                  |    |
//                                settings.ts
//
// - `extension.ts`: Activates and deactivates the extension, loads
//   codeLinks and codeLens buttons, and registers their handlers.
//
// - `codeLinks.ts`: Turns all strings enclosed with ` delimiters into
//   clickable links that run in the terminal when clicked.
//
// - `codeLens.ts`: Puts buttons that perform various actions like copying and
//   running code above all code blocks enclosed with at least 3 ` delimiters.
//
// - `runInTerminal.ts`: Handlers for either running code directly in the terminal
//   line by line or writing code to a file and compiling/running the file.
//
// - `runOnMarkdown.ts`: Handlers for writing the output of an executing process
//   directly onto the markdown file.
//
// - `settings.ts`: Provides an API to access extension settings.
//
// ************************************************************************

import * as vscode from "vscode";
import * as fs from "fs";
import treeKill from "tree-kill";
import { InlineCodeLinkProvider } from "./codeLinks";
import { ButtonCodeLensProvider } from "./codeLens";
import { runInTerminal, getRunCommand } from "./handlers/runInTerminal";
import { runOnMarkdown, childProcesses } from "./handlers/runOnMarkdown";

// List of command handlers
export const commandHandlers = [
  {
    command: "markdown.runFile",
    handler: async (language: string, code: string) =>
      runInTerminal(await getRunCommand(language, code)),
  },
  {
    command: "markdown.runOnMarkdown",
    handler: async (language: string, code: string, range: vscode.Range) =>
      await runOnMarkdown(await getRunCommand(language, code), range),
  },
  { command: "markdown.runInTerminal", handler: runInTerminal },
  {
    command: "markdown.copy",
    handler: (code: string) => vscode.env.clipboard.writeText(code),
  },
  {
    command: "markdown.delete",
    handler: (range: vscode.Range) => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.edit((text) => text.delete(range))) editor?.document.save();
    },
  },
  {
    command: "markdown.killProcess",
    handler: (pid: number, signal: string) => treeKill(pid, signal),
  },
  {
    command: "markdown.killAllProcesses",
    handler: () => {
      childProcesses.forEach(({ pid }) => treeKill(pid, "SIGKILL"));
      childProcesses.length = 0;
    },
  },
];

// List of temporary files
export const tempFilePaths: string[] = [];

// Main function that runs when extension is activated
export function activate(context: vscode.ExtensionContext) {
  // Initializes CodeLens provider for code blocks
  // Code blocks are enclosed with ```
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "markdown", scheme: "file" },
      new ButtonCodeLensProvider()
    )
  );

  // Initializes DocumentLinks provider for inline code
  // Inline code is enclosed with `
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      { language: "markdown", scheme: "file" },
      new InlineCodeLinkProvider()
    )
  );

  // Register all command handlers
  commandHandlers.forEach(({ command, handler }) =>
    context.subscriptions.push(
      vscode.commands.registerCommand(command, handler)
    )
  );
}

// Function that runs when extension is deactivated
export function deactivate() {
  // Deletes temporary files created for code block execution
  tempFilePaths.forEach((filePath) => fs.unlinkSync(filePath));
}

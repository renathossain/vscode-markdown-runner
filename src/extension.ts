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
//                 codeLinks.ts  codeLens.ts   codeRunner.ts
//                       |          |  |            |
//                       +-----+----+  +-----+------+
//                             |             |
//                         parser.ts  compilerConfig.ts
//
// - `extension.ts`: Responsible for activating the extension and orchestrating
//   the loading of the codeLinks, codeLens and registering the commands that
//   perform actions such as executing or copying code blocks.
//
// - `codeLinks.ts`: Uses `parser.ts` to parse inline code snippets, then turn them
//   into links that the user can 'Ctrl + Left Click' to run them.
//
// - `codeLens.ts`: Uses `parser.ts` to parse code blocks and determine
//   their language and content, then generate appropriate code lens buttons for
//   each code block in the editor. It only generates the buttons for languages
//   specified in the language configuration provided by `compilerConfig.ts`.
//
// - `codeRunner.ts`: Uses `compilerConfig.ts` to provide the correct file
//   extension and compiler to execute code blocks.
//
// - `compilerConfig.ts`: Provides language configurations used by `codeLens.ts`
//   and `codeRunner.ts`.
//
// - `parser.ts`: Responsible for parsing code blocks to determine their language
//   and content used by `codeLinks.ts` and `codeLens.ts`.
//
// - Data Flow:
// `compilerConfig.ts` +-+-> `codeLinks.ts` +-+-> `extension.ts` +-+-> codeRunner.ts
// `parser.ts`         +-+-> `codeLens.ts`  +-+
//
// ************************************************************************

import * as vscode from "vscode";
import * as fs from "fs";
import treeKill from "tree-kill";
import { CodeSnippetLinkProvider } from "./codeLinks";
import { ButtonCodeLensProvider, childProcesses } from "./codeLens";
import { runInTerminal, getRunCommand, runOnMarkdown } from "./handlers";

// List of command handlers
export const commandHandlers = [
  {
    command: "markdown.runFile",
    handler: async (language: string, code: string) => {
      runInTerminal(await getRunCommand(language, code));
    },
  },
  {
    command: "markdown.runOnMarkdown",
    handler: async (language: string, code: string, range: vscode.Range) => {
      await runOnMarkdown(await getRunCommand(language, code), range);
    },
  },
  { command: "markdown.runInTerminal", handler: runInTerminal },
  {
    command: "markdown.copy",
    handler: (code: string) => {
      vscode.env.clipboard.writeText(code);
      vscode.window.showInformationMessage("Code copied to clipboard.");
    },
  },
  {
    command: "markdown.stopProcess",
    handler: (pid: number) => treeKill(pid, "SIGINT"),
  },
  {
    command: "markdown.killProcess",
    handler: (pid: number) => treeKill(pid, "SIGKILL"),
  },
  {
    command: "markdown.killAllProcesses",
    handler: () => {
      childProcesses.forEach(({ pid }, i) => {
        treeKill(pid, "SIGKILL");
        childProcesses.splice(i, 1);
      });
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
      new CodeSnippetLinkProvider()
    )
  );

  // Register all command handlers
  commandHandlers.forEach(({ command, handler }) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, handler)
    );
  });
}

// Function that runs when extension is deactivated
export function deactivate() {
  // Deletes temporary files created for code block execution
  tempFilePaths.forEach((filePath) => {
    try {
      fs.unlinkSync(filePath);
    } catch {
      vscode.window.showErrorMessage(`Error deleting file ${filePath}:`);
    }
  });
}

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
//   Parsers:            Registry:           Handlers:
//   codeLens.ts ---+--> extension.ts --+--> runInTerminal.ts
//   codeLinks.ts --|                   |--> runOnMarkdown.ts
//
// - `extension.ts`: Activates and deactivates the extension, loads
//   codeLinks and codeLens buttons, and registers their handlers.
//
// - `codeLinks.ts`: Turns all strings enclosed with single ` delimiters into
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
import { InlineCodeLinkProvider, InlineCodeHoverProvider } from "./codeLinks";
import { ButtonCodeLensProvider } from "./codeLens";
import { runInTerminal, getRunCommand } from "./runInTerminal";
import {
  deleteOnMarkdown,
  runOnMarkdown,
  killProcess,
  killAllProcesses,
} from "./runOnMarkdown";

// List of temporary files
export const tempFilePaths: string[] = [];

// Providers
export let codeLensProvider: ButtonCodeLensProvider | undefined;
let disposables: vscode.Disposable[] = [];

// List of command handlers
const commands = {
  "markdown.runFile": async (lang: string, code: string) =>
    runInTerminal(await getRunCommand(lang, code)),
  "markdown.runOnMarkdown": async (
    lang: string,
    code: string,
    range: vscode.Range,
  ) => runOnMarkdown(await getRunCommand(lang, code), range),
  "markdown.runInTerminal": runInTerminal,
  "markdown.copy": (code: string) => {
    vscode.env.clipboard.writeText(code);
    vscode.window.setStatusBarMessage("Copied to clipboard!", 2000);
  },
  "markdown.delete": deleteOnMarkdown,
  "markdown.killProcess": killProcess,
  "markdown.killAllProcesses": killAllProcesses,
};

// Register the correct providers based on configuration
function registerProviders(context: vscode.ExtensionContext) {
  // Determine which file types to activate the extension on
  const selector = [{ language: "markdown", scheme: "file" }];
  const config = vscode.workspace.getConfiguration();
  if (config.get<boolean>("markdownRunner.activateOnQuarto"))
    selector.push({ language: "quarto", scheme: "file" });

  // Dispose previous providers if they exist
  disposables.forEach((d) => d.dispose());

  // Create and register the new providers
  codeLensProvider = new ButtonCodeLensProvider();
  const inlineProvider = new InlineCodeLinkProvider();
  const hoverProvider = new InlineCodeHoverProvider();
  disposables = [
    vscode.languages.registerCodeLensProvider(selector, codeLensProvider),
    vscode.languages.registerDocumentLinkProvider(selector, inlineProvider),
    vscode.languages.registerHoverProvider(selector, hoverProvider),
  ];
  context.subscriptions.push(...disposables);
}

// Main function that runs when extension is activated
export function activate(context: vscode.ExtensionContext) {
  registerProviders(context);

  // Re-register providers on a configuration change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("markdownRunner.activateOnQuarto"))
        registerProviders(context);
    }),
  );

  // Register all command handlers
  context.subscriptions.push(
    ...Object.entries(commands).map(([command, handler]) =>
      vscode.commands.registerCommand(command, handler),
    ),
  );
}

// Function that runs when extension is deactivated
export function deactivate() {
  // Deletes temporary files created for code block execution
  tempFilePaths.forEach(fs.unlinkSync);
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

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
// ************************************************************************

import * as vscode from "vscode";
import * as fs from "fs";
import { InlineCodeLinkProvider, InlineCodeHoverProvider } from "./codeLinks";
import { ButtonCodeLensProvider } from "./codeLens";
import { runInTerminal, getRunCommand } from "./runInTerminal";
import {
  childProcesses,
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
  "markdown.runBlock": async (lang: string, code: string) =>
    runInTerminal(await getRunCommand(lang, code)),
  "markdown.runInTerminal": runInTerminal,
  "markdown.runOnMarkdown": async (
    lang: string,
    code: string,
    range: vscode.Range,
  ) => runOnMarkdown(await getRunCommand(lang, code), range),
  "markdown.copy": (code: string) => {
    vscode.env.clipboard.writeText(code);
    vscode.window.setStatusBarMessage("Copied to clipboard!", 2000);
  },
  "markdown.delete": deleteOnMarkdown,
  "markdown.killProcess": killProcess,
  "markdown.killAllProcesses": killAllProcesses,
  "markdown._getProcesses": () => childProcesses,
};

// Register the correct providers based on configuration
function registerProviders(context: vscode.ExtensionContext) {
  // Determine which file types to activate the extension on
  const selector = [{ language: "markdown", scheme: "file" }];
  const config = vscode.workspace.getConfiguration();
  if (config.get<boolean>("markdownRunner.activateOnQuarto"))
    selector.push({ language: "quarto", scheme: "file" });

  // Dispose previous providers if they exist
  disposables.forEach((disposable) => disposable.dispose());

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
      if (e.affectsConfiguration("markdownRunner.enabledButtons"))
        codeLensProvider?.refresh();
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

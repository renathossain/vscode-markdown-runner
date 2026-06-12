// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as childProcess from "child_process";
import { tempFilePaths } from "./extension";

// Get the configuration for the given language and type
export function getLanguageConfig(
  language: string,
  type: "compiler" | "interpreter",
) {
  const target = language.trim().toLowerCase();
  const config =
    vscode.workspace
      .getConfiguration()
      .get<Record<string, string>>(`markdownRunner.${type}Settings`) ?? {};

  for (const [key, value] of Object.entries(config)) {
    const aliases = key.split(",").map((alias) => alias.trim());
    if (!aliases.some((alias) => alias.toLowerCase() === target)) continue;
    const [ext = "", command = ""] = value.split(";", 2);

    return { name: aliases[0], extension: ext.trim(), command: command.trim() };
  }

  return null;
}

// Obtain the correct executable name given language and code
const getBaseName = (lang: string, code: string) =>
  // Java requires executable name match the class name, which is parsed using regex
  // Match the exact words `public` and `class`, where:
  // \s+ - Matches one or more whitespace characters (spaces, tabs, etc.)
  // (\w+) - Capturing group for class name, matches one or more "word" characters
  lang === "java"
    ? (code.match(/public\s+class\s+(\w+)/)?.[1] ??
      (vscode.window.showErrorMessage(
        "Compilation failed: No public class found.",
      ),
      ""))
    : `temp_${Date.now()}`;

// Inject all enabled default codes into the code string
function injectDefaultCode(language: string, code: string) {
  // Read the configuration for pythonPath and defaultCodes
  const config = vscode.workspace.getConfiguration();
  const pythonPathEnabled = config.get<boolean>("markdownRunner.pythonPath");
  const defaultCodeConfig =
    config.get<Record<string, string>>("markdownRunner.defaultCodes") || {};

  // Inject default code, if available
  if (defaultCodeConfig[language])
    code = defaultCodeConfig[language]
      .replace(/\\n/g, "\n")
      .replace(/\$\{code\}/g, code);

  // If pythonPath is enabled, inject the markdown file's path into the code
  const editor = vscode.window.activeTextEditor;
  if (pythonPathEnabled && editor && language === "python") {
    const documentDirectory = path.dirname(editor.document.uri.fsPath);
    code = `import sys\nsys.path.insert(0, r'${documentDirectory}')\n` + code;
  }

  return code;
}

// Compile a binary using the provided command
const compile = (cmd: string) =>
  new Promise<boolean>((resolve) =>
    childProcess.exec(cmd, (error, _, stderr) => {
      const errorMsg = stderr || error?.message;
      if (errorMsg) vscode.window.showErrorMessage(errorMsg);
      resolve(!error);
    }),
  );

// Save code to a temporary file, and compile it if necessary
// Return the string to be run in the terminal to execute the binary/code
export async function getRunCommand(language: string, code: string) {
  const name = getBaseName(language, code);
  if (!name) return "";

  const compiler = getLanguageConfig(language, "compiler");
  const interp = getLanguageConfig(language, "interpreter");
  if (!interp) {
    vscode.window.showErrorMessage(
      `No interpreter configured for "${language}".`,
    );
    return "";
  }

  const dir = os.tmpdir();
  const base = path.join(dir, name);
  const exe = process.platform === "win32" ? ".exe" : "";

  code = injectDefaultCode(language, code);

  const compilerPath = compiler ? base + compiler.extension : "";
  const interpPath = base + interp.extension;
  const file = compiler ? compilerPath : interpPath;

  // Write code to a file, SECURITY: Only Owner Read and Write
  fs.writeFileSync(file, code, { mode: 0o600 });
  tempFilePaths.push(file);

  const fill = (s: string, path: string, ext: string) =>
    s
      .replace(/\$\{path\}/g, path)
      .replace(/\$\{dir\}/g, dir)
      .replace(/\$\{name\}/g, name)
      .replace(/\$\{ext\}/g, ext)
      .replace(/\$\{exe\}/g, exe);

  const runCmd = fill(interp.command, interpPath, interp.extension);
  if (!runCmd) {
    vscode.window.showErrorMessage(
      `No interpreter configured for "${language}".`,
    );
    return "";
  }

  if (!compiler) return runCmd;

  const compCmd = fill(compiler.command, compilerPath, compiler.extension);
  if (!compCmd) {
    vscode.window.showErrorMessage(`No compiler configured for "${language}".`);
    return "";
  }

  if (await compile(compCmd)) {
    tempFilePaths.push(interpPath);
    return runCmd;
  }

  return "";
}

// Run command in the terminal
export function runInTerminal(command: string) {
  if (!command) return;
  const terminal =
    vscode.window.activeTerminal || vscode.window.createTerminal();
  terminal.show();
  terminal.sendText(command);
}

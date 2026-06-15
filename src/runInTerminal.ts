// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

// Looks up language configs (compiler/interpreter) and resolves run commands.
// Supports default boilerplate injection, compilation, and terminal execution.

import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as childProcess from "child_process";
import { tempFilePaths } from "./extension";

// Look up a language's compiler or interpreter config from settings. The
// setting key is a comma-separated list of aliases, the value is "ext;command".
// Returns the first matching alias as the display name.
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

// Extract the class name from Java code (public class ...) for the source
// filename. For other languages, generate a unique temp name.
const getBaseName = (lang: string, code: string) =>
  lang === "java"
    ? (code.match(/public\s+class\s+(\w+)/)?.[1] ??
      (vscode.window.showErrorMessage(
        "Compilation failed: No public class found.",
      ),
      ""))
    : `temp_${Date.now()}`;

// Inject default boilerplate code from markdownRunner.defaultCodes.
// Replaces \n with real newlines and ${code} with the user's snippet.
// If pythonPath is enabled, prepends sys.path.insert for the document dir.
function injectDefaultCode(language: string, code: string) {
  const config = vscode.workspace.getConfiguration();
  const pythonPathEnabled = config.get<boolean>("markdownRunner.pythonPath");
  const defaultCodeConfig =
    config.get<Record<string, string>>("markdownRunner.defaultCodes") || {};

  if (defaultCodeConfig[language])
    code = defaultCodeConfig[language]
      .replace(/\\n/g, "\n")
      .replace(/\$\{code\}/g, code);

  const editor = vscode.window.activeTextEditor;
  if (pythonPathEnabled && editor && language === "python") {
    const documentDirectory = path.dirname(editor.document.uri.fsPath);
    code = `import sys\nsys.path.insert(0, r'${documentDirectory}')\n` + code;
  }

  return code;
}

// Run a compiler command and return whether it succeeded. Shows errors via
// vscode.window.showErrorMessage on failure.
const compile = (cmd: string) =>
  new Promise<boolean>((resolve) =>
    childProcess.exec(cmd, (error, _, stderr) => {
      const errorMsg = stderr || error?.message;
      if (errorMsg) vscode.window.showErrorMessage(errorMsg);
      resolve(!error);
    }),
  );

// Resolve the full run command for a language+code pair. Writes the code to a
// temp file, injects default boilerplate, compiles if a compiler is configured,
// and returns the final interpreter/run command with template placeholders
// (${path}, ${dir}, ${name}, ${ext}, ${exe}) filled in.
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

  code = injectDefaultCode(language, code);

  const compilerPath = compiler ? base + compiler.extension : "";
  const interpPath = base + interp.extension;
  const file = compiler ? compilerPath : interpPath;

  fs.writeFileSync(file, code, { mode: 0o600 });
  tempFilePaths.push(file);

  // Template fill: replaces ${path}, ${dir}, ${name}, ${ext}, ${exe}.
  const fill = (s: string, path: string, ext: string) =>
    s
      .replace(/\$\{path\}/g, path)
      .replace(/\$\{dir\}/g, dir)
      .replace(/\$\{name\}/g, name)
      .replace(/\$\{ext\}/g, ext)
      .replace(/\$\{exe\}/g, process.platform === "win32" ? ".exe" : "");

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

// Send a command to the terminal (creating one if none is active).
export function runInTerminal(command: string) {
  if (!command) return;
  const terminal =
    vscode.window.activeTerminal || vscode.window.createTerminal();
  terminal.show();
  terminal.sendText(command);
}

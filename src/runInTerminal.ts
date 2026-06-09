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
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as cp from "child_process";
import { tempFilePaths } from "./extension";

// Get the configuration for the given language and type
export function getLanguageConfig(
  language: string,
  type: "compiler" | "interpreter",
): { name: string; extension: string; command: string } | null {
  const config = vscode.workspace
    .getConfiguration()
    .get<Record<string, string>>(`markdownRunner.${type}Settings`);
  if (!config) return null;

  const target = language.trim().toLowerCase();
  for (const [key, value] of Object.entries(config)) {
    const aliases = key
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const match = aliases.some((a) => a.toLowerCase() === target);
    if (!match) continue;

    const name = aliases[0];
    const [extensionRaw, commandRaw] = value.split(";", 2);
    const extension = (extensionRaw ?? "").trim();
    const command = (commandRaw ?? "").trim();
    return {
      name,
      extension,
      command,
    };
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

  // Inject default code, if available from settings
  const newlineCode = (defaultCodeConfig[language] || "").replace(/\\n/g, "\n");
  // Explanation of regex:
  // ^: anchors search to beginning, `-I` must appear in the beginning of string
  // (.): 1st capturing group, match 1 character (like `@` in the example)
  // ([\s\S]+$): 2nd capturing group that matches 1 or more (+) of any
  // characters (\s\S) and `$` means it matches to the end of the string
  const match = /^-I(.) ([\s\S]+$)/.exec(newlineCode);
  code = match ? match[2].replace(match[1], code) : newlineCode + code;

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
    cp.exec(cmd, (error, _, stderr) => {
      const errorMsg = stderr || error?.message;
      if (errorMsg) vscode.window.showErrorMessage(errorMsg);
      resolve(!error);
    }),
  );

// Save code to a temporary file, and compile it if necessary
// Return the string to be run in the terminal to execute the binary/code
export async function getRunCommand(
  language: string,
  code: string,
): Promise<string> {
  // Obtain info to create the run command
  const name = getBaseName(language, code);
  if (!name) return "";
  const compiler = getLanguageConfig(language, "compiler");
  const interpreter = getLanguageConfig(language, "interpreter");
  if (!interpreter) return "";
  const dir = os.tmpdir();
  const commonPath = path.join(dir, name);
  const exe = process.platform === "win32" ? ".exe" : "";

  // Write code to a file, SECURITY: Only Owner Read and Write
  const compilerPath = compiler ? commonPath + compiler.extension : "";
  const interpreterPath = commonPath + interpreter.extension;
  const file = compiler ? compilerPath : interpreterPath;
  code = injectDefaultCode(language, code);
  fs.writeFileSync(file, code, { mode: 0o600 });
  tempFilePaths.push(file);
  const interpreterCommand = interpreter.command
    .replace(/\$\{path\}/g, interpreterPath)
    .replace(/\$\{dir\}/g, dir)
    .replace(/\$\{name\}/g, name)
    .replace(/\$\{ext\}/g, interpreter.extension)
    .replace(/\$\{exe\}/g, exe);

  // Compile file if compiler available
  if (compiler) {
    const compileCommand = compiler.command
      .replace(/\$\{path\}/g, compilerPath)
      .replace(/\$\{dir\}/g, dir)
      .replace(/\$\{name\}/g, name)
      .replace(/\$\{ext\}/g, compiler.extension)
      .replace(/\$\{exe\}/g, exe);
    if (await compile(compileCommand)) {
      tempFilePaths.push(interpreterPath);
      return interpreterCommand;
    } else return "";
  }

  // If not a compiled language, run the source code
  return interpreterCommand;
}

// Run command in the terminal
export function runInTerminal(code: string) {
  if (!code) return;
  const terminal =
    vscode.window.activeTerminal || vscode.window.createTerminal();
  terminal.show();
  terminal.sendText(code);
}

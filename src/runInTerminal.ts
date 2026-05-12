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
import { getLanguageConfig } from "./settings";
import { tempFilePaths } from "./extension";

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

// Compiles a binary using the provided command
// Pushes the binary path to temporary files to be deleted
// Throws an error message if unsuccessful
const compile = (cmd: string, out: string) => (
  tempFilePaths.push(out),
  new Promise<boolean>((resolve) =>
    // e - error, s - stdout, se - stderr
    cp.exec(cmd, (e, s, se) => {
      if (e || se)
        vscode.window.showErrorMessage(`${e ?? ""}${s ?? ""}${se ?? ""}`);
      resolve(!e);
    }),
  )
);

// Save code to a temporary file, and compile it if necessary
// Return the string to be run in the terminal to execute the binary/code
export async function getRunCommand(language: string, code: string) {
  // Obtain info to create the run command
  const baseName = getBaseName(language, code);
  const extension = getLanguageConfig(language, "extension");
  const compiler = getLanguageConfig(language, "compiler");
  if (!baseName || !compiler || !extension) return "";

  // Construct sourcePath
  code = injectDefaultCode(language, code);
  const basePath = path.join(os.tmpdir(), baseName);
  const sourcePath = `${basePath}.${extension}`;

  // Write code to a file, SECURITY: Only Owner Read and Write
  fs.writeFileSync(sourcePath, code, { mode: 0o600 });
  tempFilePaths.push(sourcePath);

  // Compilation for C, C++ and Rust
  const execFile = basePath + (process.platform === "win32" ? ".exe" : "");
  if (["c", "cpp", "rust"].includes(language))
    return (await compile(`${compiler} ${sourcePath} -o ${execFile}`, execFile))
      ? execFile
      : "";

  // Compilation for Java
  if (language === "java")
    return (await compile(`${compiler} ${sourcePath}`, `${basePath}.class`))
      ? `java -cp ${os.tmpdir()} ${baseName}`
      : "";

  // Compilation for TypeScript
  if (language === "typescript")
    return (await compile(`${compiler} ${sourcePath}`, `${basePath}.js`))
      ? `${getLanguageConfig("javascript", "compiler")} ${basePath}.js`
      : "";

  // If not a compiled language, run the source code
  return `${compiler} ${sourcePath}`;
}

// Run command in the terminal
export function runInTerminal(code: string) {
  if (!code) return;
  const terminal =
    vscode.window.activeTerminal || vscode.window.createTerminal();
  terminal.show();
  terminal.sendText(code);
}

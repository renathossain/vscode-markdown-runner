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
import { getLanguageConfig } from "../settings";
import { tempFilePaths } from "../extension";

// Obtain the correct executable name given language and code
function getBaseName(language: string, code: string): string {
  if (language === "java") {
    // The file name of the Java executable must match the class name
    // We parse the class name using a regex:
    // Match the exact words `public` and `class`
    // \s+ - Matches one or more whitespace characters (spaces, tabs, etc.)
    // (\w+) - Capturing group, which matches one or more "word" characters
    // (letters, digits, underscore), which corresponds to the class name
    const match = code.match(/public\s+class\s+(\w+)/);
    return match ? match[1] : ``;
  } else return `temp_${Date.now()}`;
}

// Inject all enabled default codes into the code string
function injectDefaultCode(language: string, code: string): string {
  // Read the configuration for pythonPath and defaultCodes
  const config = vscode.workspace.getConfiguration();
  const pythonPathEnabled = config.get<boolean>("markdownRunner.pythonPath");
  const defaultCodeConfig =
    config.get<{
      [language: string]: string;
    }>("markdownRunner.defaultCodes") || {};

  // If pythonPath is enabled, inject the markdown file's path into the code
  const editor = vscode.window.activeTextEditor;
  if (pythonPathEnabled && editor && language === "python") {
    const documentDirectory = path.dirname(editor.document.uri.fsPath);
    code = `import sys\nsys.path.insert(0, r'${documentDirectory}')\n` + code;
  }

  // Inject default code, if available from settings
  const defaultCode: string = defaultCodeConfig[language] || "";
  const newlineCode = defaultCode.replace(/\\n/g, "\n");
  // Explanation of regex:
  // ^: anchors search to beginning, `-I` must appear in the beginning of string
  // (.): 1st capturing group, match 1 character (like `@` in the example)
  // ([\s\S]+$): 2nd capturing group that matches 1 or more (+) of any
  // characters (\s\S) and `$` means it matches to the end of the string
  const match = /^-I(.) ([\s\S]+$)/.exec(newlineCode);
  if (match) return match[2].replace(match[1], code);
  else return newlineCode + code;
}

// Compiles a binary using the provided command
// Pushes the binary path to temporary files to be deleted
// Throws an error message if unsuccessful
function compileHandler(cmd: string, path: string): Promise<boolean> {
  tempFilePaths.push(path);
  return new Promise((resolve) => {
    cp.exec(cmd, (error, stdout, stderr) => {
      if (error || stderr !== "")
        vscode.window.showErrorMessage(`${error}${stdout}${stderr}`);
      resolve(!error);
    });
  });
}

// Save code to a temporary file, and compile it if necessary
// Return the string to be run in the terminal to execute the binary/code
export async function getRunCommand(
  language: string,
  code: string
): Promise<string> {
  // Obtain info to create the run command
  const baseName = getBaseName(language, code);
  const extension = getLanguageConfig(language, "extension");
  const compiler = getLanguageConfig(language, "compiler");
  if (!baseName || !compiler || !extension) return "";
  code = injectDefaultCode(language, code);
  const basePath = path.join(os.tmpdir(), baseName);
  const sourcePath = `${basePath}.${extension}`;

  // Write code to a file, SECURITY: Only Owner Read and Write
  fs.writeFileSync(sourcePath, code, { mode: 0o600 });
  tempFilePaths.push(sourcePath);

  // Compilation for C, C++ and Rust
  if (["c", "cpp", "rust"].includes(language))
    return (await compileHandler(
      `${compiler} ${sourcePath} -o ${basePath}`,
      basePath
    ))
      ? basePath
      : "";

  // Compilation for Java
  if (language === "java")
    return (await compileHandler(
      `${compiler} ${sourcePath}`,
      `${basePath}.class`
    ))
      ? `java -cp ${os.tmpdir()} ${baseName}`
      : "";

  // Compilation for TypeScript
  if (language === "typescript") {
    return (await compileHandler(`${compiler} ${sourcePath}`, `${basePath}.js`))
      ? `${getLanguageConfig("javascript", "compiler")} ${basePath}.js`
      : "";
  }

  // If not a compiled language, run the source code
  return `${compiler} ${sourcePath}`;
}

// Run command in the terminal
export function runInTerminal(code: string) {
  if (code === "") return;
  const terminal =
    vscode.window.activeTerminal || vscode.window.createTerminal();
  terminal.show();
  terminal.sendText(code);
}

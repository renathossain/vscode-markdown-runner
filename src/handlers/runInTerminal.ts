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

// For Java code blocks, the user needs to specify a filename
function getBaseName(language: string): Promise<string> {
  if (language === "java") {
    return new Promise<string>((resolve) => {
      vscode.window
        .showInputBox({
          prompt:
            "Enter the name of the Java file (without extension). " +
            "Note: The Java standard requires the filename to be the " +
            "same as the name of the main class.",
          placeHolder: "MyJavaFile",
        })
        .then((baseName) => {
          resolve(baseName || "");
        });
    });
  } else {
    return Promise.resolve(`temp_${Date.now()}`);
  }
}

// Inject the Python Path Code into Python Files
function injectPythonPath(language: string, code: string): string {
  // Read the Python Path configuration boolean
  const config = vscode.workspace.getConfiguration();
  const pythonPathEnabled = config.get<boolean>("markdownRunner.pythonPath");

  // If the boolean is true, inject the markdown file's path into the code
  const editor = vscode.window.activeTextEditor;
  if (pythonPathEnabled && editor && language === "python") {
    const documentDirectory = path.dirname(editor.document.uri.fsPath);
    code = `import sys\nsys.path.insert(0, r'${documentDirectory}')\n` + code;
  }

  return code;
}

// Compiles a binary using the provided command
// Throws an error message if unsuccessful
function compileHandler(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    cp.exec(command, (error, stdout, stderr) => {
      if (error) {
        // Timeout is necessary because of interference with codelens
        setTimeout(() => {
          vscode.window.showErrorMessage(stderr, { modal: true });
        }, 100);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// Save code to a temporary file and execute it
// For compiled languages, a child process is created for compilation additionally
// Return command string to be run in terminal or on markdown file as needed
export async function getRunCommand(
  language: string,
  code: string
): Promise<string> {
  const baseName = await getBaseName(language);
  if (!baseName) {
    return "";
  }
  const extension = getLanguageConfig(language, "extension");
  if (!extension) {
    return "";
  }
  const compiler = getLanguageConfig(language, "compiler");
  if (!compiler) {
    return "";
  }
  code = injectPythonPath(language, code);
  const basePath = path.join(os.tmpdir(), baseName);
  const sourcePath = `${basePath}.${extension}`;

  // Write code to a file, SECURITY: Only Owner Read and Write
  fs.writeFileSync(sourcePath, code, { mode: 0o600 });
  tempFilePaths.push(sourcePath);

  // Compilation for C, C++ and Rust
  if (language === "c" || language === "cpp" || language === "rust") {
    if (await compileHandler(`${compiler} -o ${basePath} ${sourcePath}`)) {
      tempFilePaths.push(basePath);
      return basePath;
    } else {
      return "";
    }
  }

  // Compilation for Java
  if (language === "java") {
    if (await compileHandler(`${compiler} ${sourcePath}`)) {
      tempFilePaths.push(`${basePath}.class`);
      return `java -cp ${os.tmpdir()} ${baseName}`;
    } else {
      return "";
    }
  }

  // If not a compiled language, then run it
  return `${compiler} ${sourcePath}`;
}

// Run command in the terminal
export function runInTerminal(code: string) {
  if (code === "") {
    return;
  }
  const terminal =
    vscode.window.activeTerminal || vscode.window.createTerminal();
  terminal.show();
  terminal.sendText(code);
}

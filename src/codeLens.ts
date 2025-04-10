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
import { parseCodeBlocks } from "./parser";
import { getLanguageConfig } from "./settings";

// PIDs associated with `Run on Markdown` child processes
export const childProcesses: { pid: number; range: vscode.Range }[] = [];

// CodeLens buttons provider for parsed code blocks
export class ButtonCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    // Loop through all parsed code blocks and generate buttons
    for (const { language, code, range } of parseCodeBlocks(document)) {
      const langName = getLanguageConfig(language, `name`);

      // For all supported languages, provide options to run the code block
      if (langName !== undefined) {
        pushCodeLens(
          codeLenses,
          range,
          `Run ${langName} Block`,
          `markdown.runFile`,
          [language, code]
        );
        pushCodeLens(
          codeLenses,
          range,
          `Run on Markdown`,
          `markdown.runOnMarkdown`,
          [language, code, range]
        );
      }
      // For bash code blocks, provide `run in terminal (line by line)` option
      if (language === `bash`) {
        pushCodeLens(
          codeLenses,
          range,
          `Run in Terminal`,
          `markdown.runInTerminal`,
          [code]
        );
      }
      // Always provide button to copy code
      pushCodeLens(codeLenses, range, `Copy`, `markdown.copy`, [code]);
    }

    // Generate buttons to stop `Run on Markdown` processes
    for (const { pid, range } of childProcesses) {
      pushCodeLens(codeLenses, range, `Stop Process`, `markdown.stopProcess`, [
        pid,
      ]);
      pushCodeLens(codeLenses, range, `Kill Process`, `markdown.killProcess`, [
        pid,
      ]);
    }

    return codeLenses;
  }
}

// Generate the code lens with the required parameters and push it to the list
function pushCodeLens(
  codeLenses: vscode.CodeLens[],
  range: vscode.Range,
  title: string,
  command: string,
  args: unknown[]
) {
  codeLenses.push(
    new vscode.CodeLens(range, { title, command, arguments: args })
  );
}

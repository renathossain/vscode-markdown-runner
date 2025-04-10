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

// Language configurations hold the info necessary for
// executing code blocks and providing codelens buttons
// Instead of hardcoding the language configurations,
// the user can modify the defaults in the extension settings.

// Return the language configuration for a specific language
export function getLanguageConfig(language: string, configuration: string) {
  // Obtain config values for a specific language
  const config = vscode.workspace.getConfiguration();
  const languageConfig =
    config.get<{
      [language: string]: string;
    }>("markdownRunner.compilerConfiguration") || {};
  const configValues: string[] =
    languageConfig[language] &&
    JSON.parse(languageConfig[language].replace(/'/g, '"'));

  // Map for the configuration options
  const indexMap: { [key: string]: number } = {
    name: 0,
    extension: 1,
    compiler: 2,
  };

  // Return the correct configuration
  return configValues && indexMap[configuration] !== undefined
    ? configValues[indexMap[configuration]]
    : undefined;
}

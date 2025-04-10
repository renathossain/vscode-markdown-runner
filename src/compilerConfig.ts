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

// Define the structure of the language configuration
interface LanguageConfig {
  [language: string]: string;
}

// Return the raw language configuration
export function languageMap(): LanguageConfig {
  const config = vscode.workspace.getConfiguration();
  const languageConfigurations = config.get<LanguageConfig>(
    "markdownRunner.compilerConfiguration"
  );
  return languageConfigurations || {};
}

// Return the language configuration for a specific language
export function getLanguageConfig(language: string, configuration: string) {
  const languageConfig = languageMap();
  if (Object.prototype.hasOwnProperty.call(languageConfig, language)) {
    const configValue = languageConfig[language];
    const configArray = JSON.parse(configValue.replace(/'/g, '"'));
    if (configuration === "name") {
      return configArray[0];
    } else if (configuration === "extension") {
      return configArray[1];
    } else if (configuration === "compiler") {
      return configArray[2];
    }
  }
  return undefined;
}

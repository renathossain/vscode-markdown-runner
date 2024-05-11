// vscode-markdown-runner
// Copyright (C) 2024 Renat Hossain

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

import * as vscode from 'vscode';

// Language configurations hold the info necessary for
// executing code blocks and providing codelens buttons
// Instead of hardcoding the language configurations,
// the user can modify the defaults in the `settings.json` file
type LanguageConfiguration = {
    [key: string]: {
        name: string;
        extension: string;
        compiler: string;
        compiled: boolean;
    };
};

// Reads and returns the language configurations from `settings.json` file
export function getLanguageConfigurations(): LanguageConfiguration {
    const config = vscode.workspace.getConfiguration();
    const languageConfigurations = config.get<any>('markdownRunner.compilerConfiguration');

    const parsedConfig: LanguageConfiguration = {};

    // Check if language configurations exist
    if (languageConfigurations) {
        // Loop through each language configuration
        Object.keys(languageConfigurations).forEach((language: string) => {
            const configValue = languageConfigurations[language];
            // Parse the string to JSON array, considering the quotes
            const configArray = JSON.parse(configValue.replace(/'/g, '"'));
            // Append each language configuration to the dictionary
            parsedConfig[language] = {
                name: configArray[0],
                extension: configArray[1],
                compiler: configArray[2],
                compiled: configArray[3]
            };
        });
    }

    return parsedConfig;
}
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
    const languageConfigurations = config.get<LanguageConfiguration>('markdownRunner.compilerConfiguration');
    return languageConfigurations || {};
}
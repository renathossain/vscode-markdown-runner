# Change Log

## 2.1.0

- **New Feature**: Added "Clear" and "Delete" Buttons for code blocks.
- **New Feature**: Added show/hide checkboxes for CodeLens buttons in settings.
- **New Feature**: Added per language "Default Codes" in settings, which is code that is always prepended to a file before it is compiled/executed.
- **Improvement**: Implemented automatic parsing of Java executable name from code using regex. No need to enter the file name manually.
- **Improvement**: Implemented compilation of TypeScript files the official way using `tsc`, then using `node` to run the resulting Javascript file.
- **Improvement**: Changed compilation error message appearance.
- **Bug Fix**: Fixed bug in "Run on Markdown" where last line of result block would be missing a newline.

## 2.0.0

- **New Feature:** Added "Run on Markdown" button to output execution results directly within the Markdown file. When "Run on Markdown" is pressed, the result of the execution is inserted into a new code block tagged `result` directly below the original code block. This feature includes:
  - **`Stop Process` Button:** Sends a SIGINT signal to gently interrupt the running process.
  - **`Kill Process` Button:** Sends a SIGKILL signal to forcefully terminate the process if it becomes unresponsive.
  - **`Kill All Processes` Button:** Appears in the bottom status bar of VS Code, allowing you to forcefully kill all processes.
  - If a code block tagged `result` already exists below the original code, its contents are automatically cleared before inserting new execution results.

## 1.3.0

- **Bug Fix:** Resolved an issue in `coderunner.ts` on line 107 where the code incorrectly used `${document...`. This was updated to `r'${document...` to ensure it is a raw string literal.
- **Security:** Updated npm packages to address and fix security vulnerabilities.

## 1.2.0

- Added feature that adds the directory of the markdown file to Python's sys.path, allowing you to import modules from the same directory.
- Extension settings now apply without restarting VS Code.

## 1.1.0

- Enhanced user-friendliness of "Compiler Configuration" settings by integrating them into the VS Code Extension Settings UI. Users can now directly edit, add, or reset configurations for each language without the need to modify a .json file.

## 1.0.0

- Initial release of Markdown Code Block Runner for VS Code extension.
- Added CodeLens buttons for running or copying code blocks.
- Implemented Ctrl + Left Click functionality to run code snippets in the terminal.
- Supported a variety of programming languages including C, Rust, C++, Java, TypeScript, PHP, Perl, R, Dart, Groovy, Go, Haskell, Julia, Lua, Ruby, JavaScript, Python, Bash.
- Provided instructions for installation and setup on Arch Linux.
- Outlined requirements for code execution including ensuring correctness, installing necessary languages and dependencies, and setting up environment variables.
- Included a demo Markdown file for testing features.
- Introduced extension settings for modifying compiler configurations.
- Outlined desired features for future development including automatic pasting of execution results and improving user-friendliness of settings.
- Licensed under GPL-3.0 license.

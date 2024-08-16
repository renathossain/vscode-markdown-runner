# Change Log

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
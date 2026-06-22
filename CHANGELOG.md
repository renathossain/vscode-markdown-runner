# Change Log

## 3.2.0

- **Bug Fix**: Closing the editor tab while "Run on Markdown" child processes are still running no longer permanently bricks the feature — previously the only way to recover was to restart VS Code.

## 3.1.0

- **New Feature**: Added keyboard shortcuts for "Run Block" (`Ctrl+Alt+Enter`), "Run in Terminal" (`Ctrl+Alt+T`), "Run on Markdown" (`Ctrl+Alt+M`), "Copy" (`Ctrl+Alt+C`), "Clear" (`Ctrl+Alt+Shift+D`), "Delete" (`Ctrl+Alt+D`), "Kill Process" (`Ctrl+Alt+K`), and "Kill All Processes" (`Ctrl+Alt+Shift+K`). The cursor must be inside a code block for these shortcuts to work. Can be customized in the Keyboard Shortcuts editor (`Ctrl+K Ctrl+S`).
- **New Feature**: "Run on Markdown" output now processes ANSI escape sequences through a virtual terminal, eliminating unintelligible control characters from commands like `ollama run`. Cursor movement (`\x1b[nD`, `\x1b[nG`, `\x1b[nA`), line clearing (`\x1b[K`, `\x1b[2K`), carriage returns, backspaces, and spinner animations are all rendered into clean plain text.
- **New Feature**: Added configurable terminal dimensions through the `terminalDimensions` setting. Users can adjust virtual terminal `cols` and `rows` to control line wrapping and buffered line count in `Run on Markdown` output.
- **New Feature**: Added configurable CodeLens button visibility through the `enabledButtons` setting. Users can hide Run Block, Run in Terminal, Run on Markdown, Copy, Clear, and Delete buttons to reduce clutter, while Kill process controls always remain available for safety.
- **New Feature**: Added built-in Ollama support — code blocks tagged `ollama` or `llm` are piped to `ollama run qwen2.5-coder` via stdin, enabling LLM-powered code transformation directly within Markdown.
- **New Feature**: Added support for tabbed/indented code blocks. Code fences prefixed with spaces or tabs are now detected and handled correctly by CodeLens, Run Block, Run on Markdown, Copy, and Delete operations.
- **Bug Fix**: Inline code spans inside fenced code blocks are no longer parsed as clickable links or hover targets.

## 3.0.0

- **New Feature**: Replaced the old `compilerConfiguration` setting with separate `compilerSettings` and `interpreterSettings`. Commands now support `${path}`, `${dir}`, `${name}`, `${ext}`, and `${exe}` placeholders anywhere in the command string, and a single configuration entry can be shared across multiple code block tags (e.g. `php`, `php3`, `php4`, `php5`), making language configuration significantly more flexible.
- **New Feature**: Added built-in encoding options for `Shift_JIS`, `Big5`, and `Windows-1252`. Advanced users can also specify any encoding supported by `iconv-lite` directly in `settings.json`.
- **Change**: Default code injection system (`defaultCodes`) now uses the `${code}` placeholder instead of legacy insertion markers, and treats templates without `${code}` as full overrides rather than appending user code.
- **Change**: Lowered the minimum supported VS Code version from `^1.116.0` to `^1.65.0` for broader compatibility with VS Code forks (e.g. VSCodium, Cursor).
- **Change**: Untitled code blocks (no language tag) are no longer treated as Bash blocks; only Copy, Clear, and Delete CodeLens buttons are shown for them.
- **Change**: Switched the default Haskell compiler from Stack back to `runghc`, removing the Stack project requirement for Haskell code blocks.

## 2.8.0

- **Bug Fix**: Compiler paths now correctly support escaped characters (e.g. `\ ` for spaces), preventing crashes caused by invalid path parsing.
- **Bug Fix**: Restored support for compiler arguments in Java execution paths.

## 2.7.0

- **New Feature**: Added configurable "**Output Encoding**" setting to control how process output is decoded in "Run on Markdown". Supports `utf8`, `utf16le`, `latin1`, `ascii`, `base64`, `hex`, and `gbk`, helping fix corrupted non-ASCII output on some systems (e.g. `gbk` on certain Windows setups).
- **New Feature**: Added support for capturing and displaying `stderr` output in addition to `stdout` when using "Run on Markdown".
- **Change**: Renamed `result` code block tag to `output` for more conventional naming. Existing `result` blocks are not automatically migrated; users can update them manually using global search and replace (Ctrl + Shift + F).
- **Bug Fix**: Removed hardcoded `java` command and now derive runtime from the configured `compiler` path.
- **Bug Fix**: Fixed duplicated compiler error messages.

## 2.6.0

- **Bug Fix**: Prevents deletion of code blocks during "Run on Markdown", which previously caused misplaced output.
- **Bug Fix**: Fixed lingering "Kill Process" buttons after execution completes.
- **Bug Fix**: Fixed Python path injection order causing default code to wrap the import statement (e.g. `print(import sys ...)`) instead of prepending imports.
- **Change**: Relaxed code block tag parsing — only the first word of the language tag is used, allowing inline metadata (e.g. `python{cmd=true}`) without affecting execution.

## 2.5.0

- **Bug Fix**: Fixed an issue where CodeLens buttons failed to appear or appeared in wrong positions when using "Run on Markdown".

## 2.4.0

- **New Feature**: Added official support for Windows 11 and PowerShell.
- **Bug Fix**: "Run on Markdown" now works on Windows 11 and has improved synchronization reliability.
- **Change**: Switched the default Haskell compiler to the cross-platform Stack project builder.
- **Improvement**: Added language installation instructions for Windows 11 in the README.

## 2.3.0

- **New Feature**: Added "Copy to clipboard" hover tooltip for code snippets enclosed in single backticks.
- **Change**: Added "Copied to clipboard!" status bar message.

## 2.2.0

- **New Feature**: Added Quarto Support and toggle to enable/disable it.
- **Improvement**: Added support for code blocks with more than 3 backticks to be compatible with Prettier's formatting.
- **Improvement**: Improved save synchronization to be compatible with Prettier's formatOnSave.

## 2.1.0

- **New Feature**: Added per language "Default Codes" in settings, which is code that is always prepended/inserted to a file before it is compiled/executed.
- **New Feature**: Added "Clear" and "Delete" Buttons for code blocks.
- **Improvement**: Implemented automatic parsing of Java executable name from code using regex. No need to enter the file name manually.
- **Improvement**: Implemented compilation of TypeScript files the official way using `tsc`, then using `node` to run the resulting Javascript file.
- **Change**: Changed compilation error message appearance, prints the entire error message and allows to copy the error message.
- **Change**: Removed the "Code copied to clipboard." notification.
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

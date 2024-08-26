# Markdown Code Block Runner for VS Code

This extension allows you to execute code blocks in any programming language directly from Markdown files in VS Code.

## Features

- **Execute Code Blocks**: CodeLens Buttons appear above each code block (```) for running or copying the code. Temporary files are created for execution and are cleaned up afterward.
- **Execute Code Snippets**: Run code snippets (enclosed in `) with Ctrl + Click. Results are displayed in the terminal.
- **Broad Language Support**: Supports a wide range of languages, including C, Rust, C++, Java, TypeScript, PHP, Perl, R, Dart, Groovy, Go, Haskell, Julia, Lua, Ruby, JavaScript, Python, Bash. Add non-compiled languages via settings.
- **Markdown Execution**: Execute code directly within Markdown files, with the output captured in the document.

## Requirements

Before running a code block:

- Verify "Compiler Configuration" settings are correct.
- Ensure your code is correct.
- Install necessary languages and dependencies.
- Add compilers to the PATH environment variable if necessary to enable global access to installed languages.

On Arch Linux, install all supported languages with:

```bash
sudo pacman --needed -S php perl r dart groovy go rustup ghc julia lua ruby nodejs npm python bash
```
For other systems, research language installation or use the [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/install).

## Demo

Download or copy [DEMO.md](DEMO.md) and the `demo_helpers` folder into VS Code after installing this extension, and test all the features out!

<p><img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/DEMO.gif" alt="DEMO">

## Extension Settings

### Compiler Configuration

- Configure language compilers by specifying Item: `Code Block Tag` and associated Value: `[Language Name, File Extension, Compiler Command/Path]`. Only non-compiled languages can be added.

```json
// Example
Item: python, Value: ["Python", "py", "python"]
```

- Reset settings using the ↻ icons or remove the `markdownRunner.compilerConfiguration` entry from VSCode's `settings.json` to restore to default if any issues occur.

### Python Path

Enable this to add the Markdown file's parent directory to Python's `sys.path`, allowing you to import modules from that directory.

## Future Development

Planned features (no guarantee):

- Support for multiple `Run on Markdown` output streams.

Your feedback and contributions are welcome in shaping the future of this extension!

# License

[GPL-3.0 license](LICENSE)

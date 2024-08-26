# Markdown Code Block Runner for VS Code

This extension enables the seamless execution of code blocks in any programming language within Markdown files in VS Code.

## Features

- CodeLens buttons on top of each Code Block (delimited by ```) offer options to run or copy the code. Temporary files are created for execution and are cleaned up afterward.
- Ctrl + Left Click on any Code Snippet (delimited by single `) to run it in the terminal.
- Supports a wide range of languages, including C, Rust, C++, Java, TypeScript, PHP, Perl, R, Dart, Groovy, Go, Haskell, Julia, Lua, Ruby, JavaScript, Python, Bash. Additional non-compiled languages can be added via extension settings.
- **New**: Now supports running code on the markdown file itself, where output is captured on the markdown file itself.

## Requirements

Before running a code block:

- Ensure "Compiler Configuration" settings are correct.
- Ensure the code is correct.
- Install the required language and dependencies.
- Set up path environment variables to access the installed languages globally.

On Arch Linux, you can install all supported languages with 1 command!

```bash
sudo pacman --needed -S php perl r dart groovy go rustup ghc julia lua ruby nodejs npm python bash
```

Please research the language installation process on other operating systems. Consider using the [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/install) on Windows.

## Demo

Download or copy [DEMO.md](DEMO.md) into VS Code after installing this extension, and test all the features out!

<p><img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/DEMO.gif" alt="DEMO">

## Extension Settings

### Compiler Configuration

- Add or modify the entries representing compiler configurations. Each entry consists of an array defining the properties for a specific programming language. The array elements represent: [Language Name, File Extension, Compiler Command/Path]. You can only add non-compiled languages here.

```json
// Example
["Python", "py", "python"]
```

- If there are issues, reset each entry to their default value using the reset icon ↻ and restart VS Code. Alternatively, remove the following from the VS Code `settings.json` file and restart VS Code:

```json
"markdownRunner.compilerConfiguration": {
    // settings for each language
}
```

### Python Path

Enabling this setting adds the directory of the markdown file to Python's sys.path, allowing you to import modules from the same directory.

## Future Development

Please note that the following features are desired for future development, but their implementation is not guaranteed:

- Implement support for multiple `Run on Markdown` output streams.

Your feedback and contributions are welcome in shaping the future of this extension!

# License

[GPL-3.0 license](LICENSE)

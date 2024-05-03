# Markdown Code Block Runner for VS Code

This extension enables the seamless execution of code blocks in any programming language within Markdown files in VS Code.

## Features

- CodeLens buttons on top of each code block offer options to run or copy the code. Temporary files are created for execution and are cleaned up afterward.
- Ctrl + Left Click on any Code Snippet to run it in the terminal.
- Supports a wide range of languages, including C, Rust, C++, Java, TypeScript, PHP, Perl, R, Dart, Groovy, Go, Haskell, Julia, Lua, Ruby, JavaScript, Python, Bash. Additional non-compiled languages can be added via extension settings.

## Requirements

Before running a code block:

- Ensure the code is correct.
- Install the required language and dependencies.
- Set up path environment variables to access the installed languages globally.

On Arch Linux, you can install all supported languages with 1 command!

```bash
sudo pacman --needed -S php perl r dart groovy go rustup ghc julia lua ruby nodejs npm python bash
```

On other less excellent operating systems, please research the installation process. Consider using the [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/install) on Windows.

## Demo

Download or copy [DEMO.md](DEMO.md) into VS Code after installing this extension, and test all the features out!

![DEMO](DEMO.gif)

## Extension Settings

- **Compiler Configuration**: Modify the settings.json file to add or modify language configurations. Make sure to save the settings.json and restart VS Code afterwards. To reset to default settings, delete the entire "markdownRunner.compilerConfiguration" field and all of its contents in settings.json, save, and restart VS Code:

```json
"markdownRunner.compilerConfiguration": {
    // settings for each language
}
```

## Future Development

Please note that the following features are desired for future development, but their implementation is not guaranteed:

- Implement automatic pasting of execution results within the markdown file and provide a toggle to turn it on/off.
- Improve user-friendliness of the "Compiler Configuration" settings, possibly by integrating them directly into the VS Code settings UI, instead of editing a .json file.

Your feedback and contributions are welcome in shaping the future of this extension!

# License

[GPL-3.0 license](LICENSE)

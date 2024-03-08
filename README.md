# Markdown Code Block Runner

Enables the seamless execution of code blocks in any language within Markdown files in VS Code.

## Features

- CodeLens buttons on top of each code block offer options to run or copy it. Code is saved temporarily, executed, and cleaned up afterward.
- Supports: C, Rust, C++, Java, TypeScript, PHP, Perl, R, Dart, Groovy, Go, Haskell, Julia, Lua, Ruby, JavaScript, Python, Bash. Additional languages can be added via extension settings.
- For Bash files, choose between executing code line by line or running the entire script at once.
- Automatically displays and updates execution results below code blocks. Can be turned off in extension settings.

## Requirements

Keep in mind that before running a code block:
- Make sure the code is correct
- Install the language required by the code block

On Arch Linux, you can run 1 command to install all languages!

```bash
sudo pacman --needed -S php perl r dart groovy go rust ghc julia lua ruby nodejs npm python bash
```

On other peasant operating systems, you will need to research what the installation process is.

## Demo

Download or copy DEMO.md into VS Code after installing this extension, and test all the features out!

- Paste gifs here

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

- Need to implement automatic pasting of results within the markdown file and a toggle to turn it on/off for that in settings.
- Need to implement settings where users can specify how to run new languages or change how existing ones are run.
- This extension was only tested on Arch Linux with VSCodium. Compatability with other setups is not guaranteed.

## Release Notes

### 1.0.0

To be released.

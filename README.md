# Markdown Code Block Runner for VS Code

This extension allows you to execute code blocks in any programming language directly from Markdown files in VS Code.

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunCodeBlock.gif" alt="Run Code Block" width="270">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunCodeSnippet.gif" alt="Run Code Snippet" width="270">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunOnMarkdown.gif" alt="Run On Markdown" width="270">
</div>

## Features

- **Execute Code Blocks**: CodeLens Buttons appear above each code block (```) for running or copying the code. Temporary files are created for execution and are cleaned up afterward.
- **Execute Code Snippets**: Run code snippets (enclosed in `) with Ctrl + Click. Results are displayed in the terminal.
- **Save Execution Results**: Execute code directly within Markdown files, with the output captured in the document.
- **Broad Language Support**: Supports a wide range of languages, including C, Rust, C++, Java, TypeScript, PHP, Perl, R, Dart, Groovy, Go, Haskell, Julia, Lua, Ruby, JavaScript, Python, Bash. Add non-compiled languages via settings.

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

## Demo File

Download or copy [DEMO.md](DEMO.md) and the `demo_helpers` folder into VS Code after installing this extension, and test all the features out!

## Extension Settings

### Compiler Configuration

- Configure language compilers by specifying Item: `Code Block Tag` and associated Value: `[Language Name, File Extension, Compiler Command/Path]`. Only non-compiled languages can be added.

```plaintext
// Example
Item: python, Value: ["Python", "py", "python"]
```

- Reset settings using the ↻ icons or remove the `markdownRunner.compilerConfiguration` entry from VSCode's `settings.json` to restore to default if any issues occur.

### Python Path

Enable this to add the Markdown file's parent directory to Python's `sys.path`, allowing you to import modules from that directory.

### Default Codes

By configuring the dictionary `defaultCodes`, you can prepend or wrap your code snippets with default code.

Example `setting.json`:
```
{
    "markdownRunner.defaultCodes": {
        "cpp": "-I@ #include <bits/stdc++.h>\nusing namespace std;\nint main(){\n@\n}",
        "bash": "var=123"
    }
}
```
Notice that the character "@" is a placeholder for other code. It can be replaced by any other character and must be adjacent to "-I" (no space between them).

Execution result with the above settings: 
````markdown
```cpp
cout<<456<<endl;
```

```result
456
```

```
echo $var
```

```result
123
```
````

## Future Development

Planned features (no guarantee):

- Support for multiple `Run on Markdown` output streams.

Your feedback and contributions are welcome in shaping the future of this extension!

# License

[GPL-3.0 license](LICENSE)

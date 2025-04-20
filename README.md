# Markdown Code Block Runner for VS Code

This extension allows you to execute code blocks in any programming language directly from Markdown/Quarto files in VS Code. Available on [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=renathossain.markdown-runner) and [Open VSX Registry](https://open-vsx.org/extension/renathossain/markdown-runner).

<div align="center" style="display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); max-width: 1000px; margin: auto; padding: 20px;">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunCodeBlock.gif" alt="Run Code Block" style="width: 100%; height: auto; display: block;">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunCodeSnippet.gif" alt="Run Code Snippet" style="width: 100%; height: auto; display: block;">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunOnMarkdown.gif" alt="Run On Markdown" style="width: 100%; height: auto; display: block;">
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
- For Quarto Support, also download the [Quarto VS Code Extension](https://marketplace.visualstudio.com/items?itemName=quarto.quarto).

On Arch Linux, install all supported languages with:

```bash
sudo pacman --needed -S php perl r dart groovy go rustup typescript ghc julia lua ruby nodejs npm python bash
```

For other systems, research language installation or use the [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/install).

## Demo File

Download or copy [DEMO.md](DEMO.md) and the [demo_helpers](demo_helpers) folder into VS Code after installing this extension, and test all the features out!

## Extension Settings

### Compiler Configuration

Configure language compilers by specifying for each `Language (Code Block Tag)`, the following value: `[Language Name, File Extension, Compiler Command/Path]`. Only non-compiled languages can be added.

```plaintext
// Example
Item: `python`, Value: `["Python", "py", "python"]`
```

Reset settings using the ↻ icons or remove the `markdownRunner.compilerConfiguration` entry from VSCode's `settings.json` to restore to default if any issues occur.

### Python Path

Enable this to add the Markdown file's parent directory to Python's `sys.path`, allowing you to import modules from that directory.

### Default Codes

Prepend or wrap your code blocks with default code to improve readability, by specifying for each `language (Code Block Tag)`, either the string to be prepended or the `-I@` (insert at) flag followed by whitespace and a string containing the `@` symbol where you want to insert the code.

```plaintext
// Example
Item: `bash`, Value: `var=123\n`
Item: `cpp`, Value: `-I@ #include <bits/stdc++.h>\nusing namespace std;\nint main(){\n@}\n`
```

- The Bash code `echo $var` is preceded by `var=123\n`, forming `var=123\necho $var`, which results in the output `123`.
- The code `cout << 456 << endl;` is transformed to the following, which outputs `456`:

```cpp
#include <bits/stdc++.h>
using namespace std;
int main(){
cout << 456 << endl;
}
```

## Future Development

Planned features (no guarantee):

- Support for multiple `Run on Markdown` output streams.

Your feedback and contributions are welcome in shaping the future of this extension!

# License

[GPL-3.0 license](LICENSE)

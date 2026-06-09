# Markdown Code Block Runner for VS Code

This extension allows you to execute code blocks in any programming language directly from Markdown/Quarto files in VS Code. Available on [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=renathossain.markdown-runner) and [Open VSX Registry](https://open-vsx.org/extension/renathossain/markdown-runner).

<p align="center">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunCodeBlock.gif" alt="Run Code Block" width="32%">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunCodeSnippet.gif" alt="Run Code Snippet" width="32%">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunOnMarkdown.gif" alt="Run On Markdown" width="32%">
</p>

## Features

- **Execute Code Blocks**: Run or copy code using CodeLens buttons displayed above each code block (```).
- **Execute Code Snippets**: Run terminal commands (enclosed in `) using Ctrl + Click, or copy them via the hover tooltip.
- **Save Execution Results**: Use "Run on Markdown" to capture and insert the output of executed code blocks directly into the Markdown document.
- **Broad Language Support**: Supports a wide range of languages, including C, Rust, C++, Java, TypeScript, PHP, Perl, R, Dart, Groovy, Go, Haskell, Julia, Lua, Ruby, JavaScript, Python, Bash, and PowerShell. Additional languages can be added via settings.

## Requirements

Before running a code block:

- Install the required languages and dependencies.
- Ensure all required executables are available on your system PATH if they are not automatically detected.
- Verify that the **Compiler Configuration** settings are correctly configured.
- Ensure your code is correct.
- For Quarto support, install the [Quarto VS Code Extension](https://marketplace.visualstudio.com/items?itemName=quarto.quarto).

On Windows 11, install all supported languages in PowerShell using [Chocolatey](https://chocolatey.org/install):

```powershell
choco install -y python nodejs ruby lua julia ghc golang groovy dart-sdk r.project strawberryperl php mingw rustup.install openjdk
refreshenv
npm install -g typescript
rustup default stable-x86_64-pc-windows-gnu

# Add R to PATH variable
$rBin = Get-ChildItem "C:\Program Files\R" -Directory | Sort-Object Name -Descending | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "bin" }
if (-not ($env:PATH.Split(';') -contains $rBin)) { [Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$rBin", [EnvironmentVariableTarget]::User) }
```

On Arch Linux, install all supported languages with:

```bash
sudo pacman --needed -S bash python nodejs ruby lua julia ghc go groovy dart r perl php typescript gcc rustup jdk-openjdk
rustup default stable
```

For other systems, research language installation or use the [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/install).

## Demo File

Download or copy [DEMO.md](DEMO.md)/[DEMO.qmd](DEMO.qmd) and the [demo_helpers](demo_helpers) folder into VS Code after installing this extension, and test all the features out!

## Extension Settings

### Compiler & Interpreter Settings

- **Compiler commands** are optional and run before interpreter commands.
- **Interpreter commands** are mandatory and run after compiler commands. The first tag in each language list is used for the CodeLens button.

Enter the temporary file extension, then the compile command. Available placeholders: `${path}`, `${dir}`, `${name}`, `${ext}`, `${exe}`. Click ↻ to restore defaults. Example:

```json
"markdownRunner.compilerSettings": {
  "C": ".c; gcc ${path} -o ${dir}/${name}",
  "TypeScript, ts": ".ts; tsc --ignoreConfig ${path}"
},
"markdownRunner.interpreterSettings": {
  "C": "; ${path}",
  "TypeScript, ts": ".js; node ${path}",
}
```

### Python Path

Enable to add the Markdown file's parent directory to Python's `sys.path`, allowing you to import modules from that directory.

### Default Codes

Prepend or wrap your code blocks with default code to improve readability, by specifying for each `language (Code Block Tag)`, either the string to be prepended or the `-I@` (insert at) flag followed by whitespace and a string containing the `@` symbol where you want to insert the code.

```plaintext
// Example
Item: `python`, Value: `var = 123\n`
Item: `cpp`, Value: `-I@ #include <bits/stdc++.h>\nusing namespace std;\nint main(){\n@}\n`
```

- The Python code `print(var)` is preceded by `var = 123\n`, forming `var = 123\nprint(var)`, which results in the output `123`.
- The code `cout << 456 << endl;` is transformed to the following, which outputs `456`:

```cpp
#include <bits/stdc++.h>
using namespace std;
int main(){
cout << 456 << endl;
}
```

### Activate On Quarto

Enable to activate the extension on Quarto (.qmd) files.

### Output Encoding

Encoding used to decode `Run on Markdown` process output via [iconv-lite](https://github.com/pillarjs/iconv-lite). Pick a common value from the list, or set any other [supported encoding](https://github.com/pillarjs/iconv-lite/wiki/Supported-Encodings) directly in `settings.json`. Change to `gbk` if non-ASCII characters appear corrupted on some Windows systems.

## Future Development

Planned features (no guarantee):

- Support for multiple `Run on Markdown` output streams.

Your feedback and contributions are welcome in shaping the future of this extension!

## License

[GPL-3.0 license](LICENSE)

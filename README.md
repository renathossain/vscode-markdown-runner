# Markdown Code Block Runner for VS Code

This extension allows you to execute code blocks in any programming language directly from Markdown/Quarto files in VS Code. Available on [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=renathossain.markdown-runner) and [Open VSX Registry](https://open-vsx.org/extension/renathossain/markdown-runner).

<p align="center">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunCodeBlock.gif" alt="Run Code Block" width="32%">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunCodeSnippet.gif" alt="Run Code Snippet" width="32%">
  <img src="https://github.com/renathossain/vscode-markdown-runner/raw/master/assets/RunOnMarkdown.gif" alt="Run On Markdown" width="32%">
</p>

## Features

- **Execute Code Blocks**: CodeLens Buttons appear above each code block (```) for running or copying the code. Temporary files are created for execution and are cleaned up afterward.
- **Execute Code Snippets**: Run code snippets (enclosed in `) with Ctrl + Click. Results appear in the terminal. Copy snippets using the hover tooltip.
- **Save Execution Results**: Capture the output of executing a code block directly within the Markdown document.
- **Broad Language Support**: Supports a wide range of languages, including C, Rust, C++, Java, TypeScript, PHP, Perl, R, Dart, Groovy, Go, Haskell, Julia, Lua, Ruby, JavaScript, Python, Bash. Add non-compiled languages via settings.

## Requirements

Before running a code block:

- Verify "Compiler Configuration" settings are correct.
- Ensure your code is correct.
- Install necessary languages and dependencies.
- Add compilers to the PATH environment variable if necessary to enable global access to installed languages.
- For Quarto Support, also download the [Quarto VS Code Extension](https://marketplace.visualstudio.com/items?itemName=quarto.quarto).

On Windows 11, install all supported languages. When prompted during installation, always check the "Add to PATH" option.

```powershell
$pkgs = "Python", "OpenJS.NodeJS", "RubyInstallerTeam.Ruby.3.4", "rjpcomputing.luaforwindows", "commercialhaskell.stack", "GoLang.Go", "Apache.Groovy.4", "Google.DartSDK", "RProject.R", "StrawberryPerl.StrawberryPerl", "PHP.PHP.8.4", "MartinStorsjo.LLVM-MinGW.UCRT", "Rustlang.Rustup", "EclipseAdoptium.Temurin.17.JDK"
$pkgs | ForEach-Object { winget install $_ --accept-package-agreements --accept-source-agreements }
winget install "JuliaLang.Julia" --interactive # Check "Add to PATH" checkbox

# Add R to PATH variable
$rBin = Get-ChildItem "C:\Program Files\R" -Directory | Sort-Object Name -Descending | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "bin" }
if (-not ($env:PATH.Split(';') -contains $rBin)) { [Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$rBin", [EnvironmentVariableTarget]::User) }
```

Relaunch Powershell and continue installing:

```powershell
rustup default stable-x86_64-pc-windows-gnu
npm install -g typescript
stack setup
```

On Arch Linux, install all supported languages with:

```bash
sudo pacman --needed -S bash python nodejs ruby lua julia go groovy dart r perl php typescript gcc rustup jdk-openjdk
rustup default stable
yay --needed -S stack-bin
stack setup
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

Enable to add the Markdown file's parent directory to Python's `sys.path`, allowing you to import modules from that directory.

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

### Activate On Quarto

Enable to activate the extension on Quarto (.qmd) files.

## Future Development

Planned features (no guarantee):

- Support for multiple `Run on Markdown` output streams.

Your feedback and contributions are welcome in shaping the future of this extension!

## License

[GPL-3.0 license](LICENSE)

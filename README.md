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
- Verify that the **[Compiler & Interpreter Settings](#compiler--interpreter-settings)** are correctly configured.
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

Download or copy [DEMO.md](DEMO.md) and the [demo_helpers](demo_helpers) folder into VS Code after installing this extension, and test all the features out!

## Extension Settings

### Compiler & Interpreter Settings

- **Compiler commands** are optional and run before interpreter commands.
- **Interpreter commands** are mandatory and run after compiler commands. The first tag in each language list is used for the CodeLens button.

Enter the temporary file extension, then the compile command. Available placeholders: `${path}`, `${dir}`, `${name}`, `${ext}`, `${exe}`. Click ↻ to restore defaults.

Example:

```json
"markdownRunner.compilerSettings": {
  "C": ".c; gcc ${path} -o ${dir}/${name}${exe}",
  "TypeScript, ts": ".ts; tsc --ignoreConfig ${path}"
},
"markdownRunner.interpreterSettings": {
  "C": "; ${path}${exe}",
  "TypeScript, ts": ".js; node ${path}"
}
```

### Enabled Buttons

Controls which CodeLens buttons are shown above code blocks. Disable buttons you do not use to reduce clutter. Stop, Kill, and Kill All process controls are always shown when needed for safety.

### Default Codes

To avoid repetitive boilerplate, prepend, wrap, or append default code to parsed code blocks, and use the placeholder `${code}` to indicate where the parsed code should be inserted.

If `${code}` is not present in the template, the default code is treated as a complete program and will run as-is, ignoring the parsed code block.

Example:

```json
"markdownRunner.defaultCodes": {
  "cpp": "#include <bits/stdc++.h>\\nusing namespace std;\\nint main(){\\n${code}}\\n",
  "python": "var = 123\\n${code}",
}
```

With the added default codes:

- the Python code `print(var)` outputs `123`.
- the C++ code `cout << 456 << endl;` outputs `456`.

### Python Path

Enable to add the Markdown file's parent directory to Python's `sys.path`, allowing you to import modules from that directory.

### Output Encoding

Encoding used to decode `Run on Markdown` process output via [iconv-lite](https://github.com/pillarjs/iconv-lite). Pick a common value from the list, or set any other [supported encoding](https://github.com/pillarjs/iconv-lite/wiki/Supported-Encodings) directly in `settings.json`. Change to `gbk` if non-ASCII characters appear corrupted on some Windows systems.

### Activate On Quarto

Enable to activate the extension on Quarto (.qmd) files.

### Terminal Dimensions

Dimensions of the virtual terminal used to process ANSI escape sequences in `Run on Markdown` output. Increase `cols` to reduce unwanted line wrapping for wide output. Increase `rows` to capture more buffered lines.

### Keyboard Shortcuts

Default keyboard shortcuts for executing code blocks and inline snippets:

- **Run Block**: `Ctrl+Alt+Enter`
- **Run in Terminal**: `Ctrl+Alt+T` (for Bash and PowerShell code blocks, or inline code snippets)
- **Run on Markdown**: `Ctrl+Alt+M`
- **Copy**: `Ctrl+Alt+C` (for code blocks or inline code snippets)
- **Clear**: `Ctrl+Alt+Shift+D`
- **Delete**: `Ctrl+Alt+D`
- **Kill Process**: `Ctrl+Alt+K`
- **Kill All Processes**: `Ctrl+Alt+Shift+K`

Customize these shortcuts via VS Code's Keyboard Shortcuts editor (`Ctrl+K Ctrl+S`).

## Future Development

Your feedback and contributions are welcome in shaping the future of this extension!

## License

[GPL-3.0 license](LICENSE)

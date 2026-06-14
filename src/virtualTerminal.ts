// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

// Virtual terminal that writes process output to the document.
// Processes ANSI escape sequences. Supports: newline

import * as vscode from "vscode";

export class VirtualTerminal {
  private editor;
  private row;
  private col;
  private cursorRow = 0;
  private cursorCol = 0;

  constructor(editor: vscode.TextEditor, row: number, col: number) {
    this.editor = editor;
    this.row = row;
    this.col = col;
  }

  private vscodePos = () =>
    new vscode.Position(this.row + this.cursorRow, this.col + this.cursorCol);
  private vscodeInsert = async (str: string) =>
    await this.editor.edit((edit) => edit.insert(this.vscodePos(), str));

  async write(data: string) {
    await this.vscodeInsert(data);
    const rows = data.split("\n");
    const last = rows[rows.length - 1];
    this.cursorRow += rows.length - 1;
    this.cursorCol =
      rows.length === 1 ? this.cursorCol + last.length : last.length;
  }

  async end() {
    if (this.cursorCol !== 0) {
      await this.vscodeInsert("\n");
      this.cursorRow++;
      this.cursorCol = 0;
    }
  }
}

import * as vscode from 'vscode';

let deco: vscode.TextEditorDecorationType | undefined;

export function highlightRanges(editor: vscode.TextEditor, ranges: vscode.Range[]) {
  if (deco) deco.dispose();
  deco = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('editor.findMatchBackground'),
    border: '1px solid',
    borderColor: new vscode.ThemeColor('editor.findMatchBorder')
  });
  editor.setDecorations(deco, ranges);
  if (ranges[0]) editor.revealRange(ranges[0], vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

export function clearHighlights() {
  if (deco) { deco.dispose(); deco = undefined; }
}

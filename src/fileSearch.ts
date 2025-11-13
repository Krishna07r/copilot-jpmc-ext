import * as vscode from 'vscode';

export type PySymbols = {
  functions: { name: string; range: vscode.Range }[];
  classes: { name: string; range: vscode.Range }[];
  others: { name: string; kind: vscode.SymbolKind; range: vscode.Range }[];
};

export async function getPythonSymbols(doc: vscode.TextDocument): Promise<PySymbols> {
  const uri = doc.uri;
  const symbols = (await vscode.commands.executeCommand(
    'vscode.executeDocumentSymbolProvider',
    uri
  )) as vscode.DocumentSymbol[] | undefined;

  const out: PySymbols = { functions: [], classes: [], others: [] };
  if (!symbols) return out;

  const walk = (sym: vscode.DocumentSymbol) => {
    if (sym.kind === vscode.SymbolKind.Function || sym.kind === vscode.SymbolKind.Method) {
      out.functions.push({ name: sym.name, range: sym.selectionRange });
    } else if (sym.kind === vscode.SymbolKind.Class) {
      out.classes.push({ name: sym.name, range: sym.selectionRange });
    } else {
      out.others.push({ name: sym.name, kind: sym.kind, range: sym.selectionRange });
    }
    for (const child of sym.children ?? []) walk(child);
  };
  for (const s of symbols) walk(s);
  return out;
}

export function listImports(doc: vscode.TextDocument): { line: number; text: string }[] {
  const results: { line: number; text: string }[] = [];
  const re = /^(?:from\s+[.\w]+\s+import\s+[\w*,\s]+|import\s+[.\w]+(?:\s+as\s+\w+)?)/;
  for (let i = 0; i < doc.lineCount; i++) {
    const t = doc.lineAt(i).text;
    if (re.test(t)) results.push({ line: i + 1, text: t.trim() });
  }
  return results;
}

export function grepInDoc(
  doc: vscode.TextDocument,
  needle: string,
  opts?: { caseSensitive?: boolean; regex?: boolean; max?: number }
): { line: number; col: number; text: string; range: vscode.Range }[] {
  const caseSensitive = !!opts?.caseSensitive;
  const useRegex = !!opts?.regex;
  const max = Math.max(1, opts?.max ?? 100);

  const hits: { line: number; col: number; text: string; range: vscode.Range }[] = [];
  if (!needle) return hits;

  let re: RegExp | null = null;
  if (useRegex) re = new RegExp(needle, caseSensitive ? 'g' : 'gi');

  for (let i = 0; i < doc.lineCount && hits.length < max; i++) {
    const raw = doc.lineAt(i).text;
    if (useRegex && re) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(raw)) && hits.length < max) {
        const start = new vscode.Position(i, m.index);
        const end = new vscode.Position(i, m.index + m[0].length);
        hits.push({ line: i + 1, col: m.index + 1, text: raw, range: new vscode.Range(start, end) });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    } else {
      const hay = caseSensitive ? raw : raw.toLowerCase();
      const n = caseSensitive ? needle : needle.toLowerCase();
      let idx = hay.indexOf(n);
      while (idx >= 0 && hits.length < max) {
        const start = new vscode.Position(i, idx);
        const end = new vscode.Position(i, idx + n.length);
        hits.push({ line: i + 1, col: idx + 1, text: raw, range: new vscode.Range(start, end) });
        idx = hay.indexOf(n, idx + Math.max(1, n.length));
      }
    }
  }
  return hits;
}

export function codeBlockWithContext(
  doc: vscode.TextDocument,
  lineNum: number,
  context = 2
): string {
  const start = Math.max(0, lineNum - 1 - context);
  const end = Math.min(doc.lineCount - 1, lineNum - 1 + context);
  const lines: string[] = [];
  for (let i = start; i <= end; i++) {
    const n = String(i + 1).padStart(4, ' ');
    lines.push(`${n}  ${doc.lineAt(i).text}`);
  }
  return ['```python', ...lines, '```', ''].join('\n');
}

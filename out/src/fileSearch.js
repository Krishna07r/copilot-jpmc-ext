"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPythonSymbols = getPythonSymbols;
exports.listImports = listImports;
exports.grepInDoc = grepInDoc;
exports.codeBlockWithContext = codeBlockWithContext;
const vscode = __importStar(require("vscode"));
async function getPythonSymbols(doc) {
    const uri = doc.uri;
    const symbols = (await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri));
    const out = { functions: [], classes: [], others: [] };
    if (!symbols)
        return out;
    const walk = (sym) => {
        if (sym.kind === vscode.SymbolKind.Function || sym.kind === vscode.SymbolKind.Method) {
            out.functions.push({ name: sym.name, range: sym.selectionRange });
        }
        else if (sym.kind === vscode.SymbolKind.Class) {
            out.classes.push({ name: sym.name, range: sym.selectionRange });
        }
        else {
            out.others.push({ name: sym.name, kind: sym.kind, range: sym.selectionRange });
        }
        for (const child of sym.children ?? [])
            walk(child);
    };
    for (const s of symbols)
        walk(s);
    return out;
}
function listImports(doc) {
    const results = [];
    const re = /^(?:from\s+[.\w]+\s+import\s+[\w*,\s]+|import\s+[.\w]+(?:\s+as\s+\w+)?)/;
    for (let i = 0; i < doc.lineCount; i++) {
        const t = doc.lineAt(i).text;
        if (re.test(t))
            results.push({ line: i + 1, text: t.trim() });
    }
    return results;
}
function grepInDoc(doc, needle, opts) {
    const caseSensitive = !!opts?.caseSensitive;
    const useRegex = !!opts?.regex;
    const max = Math.max(1, opts?.max ?? 100);
    const hits = [];
    if (!needle)
        return hits;
    let re = null;
    if (useRegex)
        re = new RegExp(needle, caseSensitive ? 'g' : 'gi');
    for (let i = 0; i < doc.lineCount && hits.length < max; i++) {
        const raw = doc.lineAt(i).text;
        if (useRegex && re) {
            let m;
            while ((m = re.exec(raw)) && hits.length < max) {
                const start = new vscode.Position(i, m.index);
                const end = new vscode.Position(i, m.index + m[0].length);
                hits.push({ line: i + 1, col: m.index + 1, text: raw, range: new vscode.Range(start, end) });
                if (m.index === re.lastIndex)
                    re.lastIndex++;
            }
        }
        else {
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
function codeBlockWithContext(doc, lineNum, context = 2) {
    const start = Math.max(0, lineNum - 1 - context);
    const end = Math.min(doc.lineCount - 1, lineNum - 1 + context);
    const lines = [];
    for (let i = start; i <= end; i++) {
        const n = String(i + 1).padStart(4, ' ');
        lines.push(`${n}  ${doc.lineAt(i).text}`);
    }
    return ['```python', ...lines, '```', ''].join('\n');
}
//# sourceMappingURL=fileSearch.js.map
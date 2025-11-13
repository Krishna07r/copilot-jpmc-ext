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
exports.registerJpmcChatParticipant = registerJpmcChatParticipant;
const vscode = __importStar(require("vscode"));
const apiClient_1 = require("./apiClient");
const fileSearch_1 = require("./fileSearch");
const highlight_1 = require("./highlight");
function toLowerTrim(s) { return (s ?? '').trim().toLowerCase(); }
function isListServices(text) {
    const t = toLowerTrim(text);
    return t === '' || /^list( all)?( services)?$/.test(t) || /\blist services\b/.test(t);
}
function parseSearch(raw) {
    const txt = (raw ?? '').trim();
    if (!txt)
        return null;
    const lower = txt.toLowerCase();
    let body = txt;
    if (lower.startsWith('search '))
        body = txt.slice(7);
    else if (lower.startsWith('find '))
        body = txt.slice(5);
    const parts = body.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
    let qs = [];
    let caseSensitive = false;
    let regex = false;
    let max = 50;
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p === '-s')
            caseSensitive = true;
        else if (p === '-i')
            caseSensitive = false;
        else if (p === '-re')
            regex = true;
        else if (p === '-n' && parts[i + 1]) {
            max = Math.max(1, parseInt(parts[++i], 10) || 50);
        }
        else
            qs.push(p.replace(/^"|"$/g, ''));
    }
    const query = qs.join(' ').trim();
    if (!query)
        return null;
    return { caseSensitive, regex, max, query };
}
function registerJpmcChatParticipant(context) {
    const participant = vscode.chat.createChatParticipant("jpmc", async (request, _ctx, stream, token) => {
        const raw = request.prompt ?? "";
        const text = raw.trim();
        try {
            // HELP
            if (toLowerTrim(text) === "help" || text.trim() === "?") {
                stream.markdown([
                    "**JPMC Assistant – quick help**",
                    "",
                    "_Python file search_",
                    "- `search <text>` · `find <text>` · just type words (e.g., `jwt decode`)",
                    "- flags: `-s` (case-sensitive), `-i` (default), `-re` (regex), `-n 100` (limit)",
                    "- `list functions` · `list classes` · `list imports`",
                    "",
                    "_Service catalog_",
                    "- `list services` or keywords like `card auth`, `kyc`, `ledger`",
                    ""
                ].join("\n"));
                return;
            }
            // If a Python file is active, default to "file search" behavior
            const editor = vscode.window.activeTextEditor;
            const isPy = editor?.document.languageId === 'python';
            if (isPy) {
                const doc = editor.document;
                const lower = toLowerTrim(text);
                // simple lists
                if (/^list functions?$/.test(lower)) {
                    const syms = await (0, fileSearch_1.getPythonSymbols)(doc);
                    if (syms.functions.length === 0) {
                        stream.markdown("_No functions found._");
                        return;
                    }
                    stream.markdown("### Functions\n" + syms.functions.map(s => `- \`${s.name}\` (line ${s.range.start.line + 1})`).join("\n") + "\n");
                    return;
                }
                if (/^list classes?$/.test(lower)) {
                    const syms = await (0, fileSearch_1.getPythonSymbols)(doc);
                    if (syms.classes.length === 0) {
                        stream.markdown("_No classes found._");
                        return;
                    }
                    stream.markdown("### Classes\n" + syms.classes.map(s => `- \`${s.name}\` (line ${s.range.start.line + 1})`).join("\n") + "\n");
                    return;
                }
                if (/^list imports?$/.test(lower)) {
                    const imps = (0, fileSearch_1.listImports)(doc);
                    if (imps.length === 0) {
                        stream.markdown("_No imports found._");
                        return;
                    }
                    stream.markdown("### Imports\n" + imps.map(i => `- (line ${i.line}) \`${i.text}\``).join("\n") + "\n");
                    return;
                }
                // universal search: treat anything not clearly "services" as file search
                const svcHint = /\b(service|services|endpoint|endpoints|card|kyc|ledger)\b/i.test(text);
                const parsed = parseSearch(text) ?? (!svcHint ? { caseSensitive: false, regex: false, max: 50, query: text } : null);
                if (parsed) {
                    const { caseSensitive, regex, max, query } = parsed;
                    const hits = (0, fileSearch_1.grepInDoc)(doc, query, { caseSensitive, regex, max });
                    if (hits.length === 0) {
                        (0, highlight_1.clearHighlights)();
                        stream.markdown(`_No matches for **${query}**._`);
                        return;
                    }
                    // highlight all & reveal first
                    (0, highlight_1.highlightRanges)(editor, hits.map(h => h.range));
                    // print results and a context block
                    stream.markdown(`### Matches for \`${query}\` (${hits.length}${hits.length === max ? '+' : ''})\n` +
                        hits.slice(0, Math.min(50, hits.length)).map(h => `- line ${h.line}, col ${h.col}: \`${h.text.trim()}\``).join("\n") +
                        "\n");
                    stream.markdown((0, fileSearch_1.codeBlockWithContext)(doc, hits[0].line, 3));
                    return;
                }
            }
            // ------ Service catalog (existing behavior) ------
            if (isListServices(text)) {
                const apiRes = await (0, apiClient_1.queryInternalAPI)({ kind: "serviceSearch", q: "list services" }, { isCancellationRequested: token.isCancellationRequested });
                if (token.isCancellationRequested)
                    return;
                if (apiRes.items.length === 0) {
                    stream.markdown("No services are registered in the catalog.");
                    return;
                }
                stream.markdown("### Services\n" +
                    apiRes.items.map(i => `- **${i.name}** → \`${i.owner}\` • ${i.description}`).join("\n") +
                    "\n");
                return;
            }
            const looksLikeSvc = /\b(service|services|endpoint|endpoints|find|search|card|kyc|ledger)\b/i.test(text);
            if (looksLikeSvc) {
                const repo = vscode.workspace.workspaceFolders?.[0]?.name ?? "repo";
                stream.markdown(`Looking up **service contracts** in \`${repo}\`…\n`);
                const apiRes = await (0, apiClient_1.queryInternalAPI)({ kind: "serviceSearch", q: text }, { isCancellationRequested: token.isCancellationRequested });
                if (token.isCancellationRequested)
                    return;
                if (apiRes.items.length === 0) {
                    stream.markdown([
                        "No matches. Try one of these:",
                        "- **CardAuth** – payments-platform (AuthN/Z for card flows)",
                        "- **KYCProfile** – risk-kyc (KYC profiles & risk flags)",
                        "- **LedgerWrite** – core-ledger (Idempotent write API)",
                        "",
                        "You can also type **`@jpmc list services`**."
                    ].join("\n"));
                    return;
                }
                stream.markdown("### Matches\n\n");
                stream.markdown("\n" + apiRes.items.map(i => `- **${i.name}** → \`${i.owner}\` • ${i.description}`).join("\n") + "\n\n");
                const svcName = apiRes.items[0]?.name;
                if (svcName) {
                    stream.markdown("Here’s a boilerplate client for the first match:\n\n");
                    stream.markdown([
                        "```ts",
                        "import axios from 'axios';",
                        `export async function get${svcName}(id: string) {`,
                        "  const r = await axios.get(process.env.SVC_URL + '/v1/resource/' + id, {",
                        "    headers: { 'X-Request-Id': crypto.randomUUID() }",
                        "  });",
                        "  return r.data;",
                        "}",
                        "```",
                        ""
                    ].join("\n"));
                    stream.markdown("**cURL example** (replace ID and SVC_URL):\n\n");
                    stream.markdown([
                        "```bash",
                        "curl -X GET \"$SVC_URL/v1/resource/123\" \\",
                        "  -H \"X-Request-Id: $(uuidgen)\" \\",
                        "  -H \"Accept: application/json\"",
                        "```",
                        ""
                    ].join("\n"));
                }
                return;
            }
            // fallback
            const files = await vscode.workspace.findFiles("**/*.md", "**/node_modules/**", 5);
            const toc = files.map(f => "- " + vscode.workspace.asRelativePath(f.fsPath)).join("\n");
            stream.markdown([
                `I found these docs in your workspace:`,
                toc || "_No docs found_",
                "",
                "Type `@jpmc help` to see search commands.",
                ""
            ].join("\n"));
        }
        catch (err) {
            stream.markdown([
                "⚠️ **Something went wrong while processing your request.**",
                "Please try again, or run `@jpmc help`.",
                "",
                "_Details for debugging: " + (err?.message ?? String(err)) + "_"
            ].join("\n"));
        }
    });
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "assets/logo.png");
    return participant;
}
//# sourceMappingURL=chat.js.map
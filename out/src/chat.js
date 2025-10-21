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
function normalize(s) {
    return (s ?? '').toLowerCase().trim();
}
function isListQuery(text) {
    const t = normalize(text);
    return t === '' || /^list( all)?( services)?$/.test(t) || /\blist services\b/.test(t);
}
function registerJpmcChatParticipant(context) {
    // Handler signature: (request, context, stream, token)
    const participant = vscode.chat.createChatParticipant("jpmc", async (request, _ctx, stream, token) => {
        const text = normalize(request.prompt ?? "");
        // --- HELP ---
        if (text === "help" || text === "?") {
            stream.markdown("**JPMC Assistant – commands**\n\n" +
                "- `list services` – show all known services\n" +
                "- `find <name>` or any keywords (e.g. `card auth`, `kyc`, `ledger`)\n\n" +
                "**Examples**\n" +
                "- `@jpmc list services`\n" +
                "- `@jpmc find CardAuth endpoints`\n" +
                "- `@jpmc kyc`\n");
            return;
        }
        // --- LIST SERVICES ---
        if (isListQuery(text)) {
            const apiRes = await (0, apiClient_1.queryInternalAPI)({ kind: "serviceSearch", q: "list services" }, { isCancellationRequested: token.isCancellationRequested });
            if (token.isCancellationRequested)
                return;
            if (apiRes.items.length === 0) {
                stream.markdown("No services are registered in the catalog.");
                return;
            }
            stream.markdown(apiRes.items.map(i => `- **${i.name}** → \`${i.owner}\` • ${i.description}`).join("\n"));
            return;
        }
        // --- SEARCH / DEFAULT SERVICE LOOKUP ---
        // Treat any query with intent words OR just keywords as a search
        const looksLikeSearch = /\b(service|services|endpoint|endpoints|find|search|card|kyc|ledger)\b/.test(text);
        if (looksLikeSearch) {
            const repo = vscode.workspace.workspaceFolders?.[0]?.name ?? "repo";
            stream.markdown(`Looking up **service contracts** in \`${repo}\`…`);
            const apiRes = await (0, apiClient_1.queryInternalAPI)({ kind: "serviceSearch", q: text }, { isCancellationRequested: token.isCancellationRequested });
            if (token.isCancellationRequested)
                return;
            if (apiRes.items.length === 0) {
                stream.markdown("No matches. Try one of these:\n" +
                    "- **CardAuth** – payments-platform (AuthN/Z for card flows)\n" +
                    "- **KYCProfile** – risk-kyc (KYC profiles & risk flags)\n" +
                    "- **LedgerWrite** – core-ledger (Idempotent write API)\n\n" +
                    "You can also type **`@jpmc list services`**.");
                return;
            }
            stream.markdown(apiRes.items.map(i => `- **${i.name}** → \`${i.owner}\` • ${i.description}`).join("\n"));
            // Provide boilerplate client for the top hit (only if present)
            const svcName = apiRes.items[0]?.name;
            if (svcName) {
                stream.markdown("\nHere’s a boilerplate client for the first match:");
                stream.markdown("```ts\n" +
                    "import axios from 'axios';\n" +
                    `export async function get${svcName}(id: string){\n` +
                    "  const r = await axios.get(process.env.SVC_URL + '/v1/resource/' + id, {\n" +
                    "    headers: { 'X-Request-Id': crypto.randomUUID() }\n" +
                    "  });\n" +
                    "  return r.data;\n" +
                    "}\n" +
                    "```");
            }
            return;
        }
        // --- WORKSPACE DOCS FALLBACK ---
        const files = await vscode.workspace.findFiles("**/*.md", "**/node_modules/**", 5);
        const toc = files.map(f => "- " + vscode.workspace.asRelativePath(f.fsPath)).join("\n");
        stream.markdown(`I found these docs in your workspace:\n${toc || "_No docs found_"}\n\n` +
            "Type `@jpmc list services` or `@jpmc help` to get started.");
    });
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "assets/logo.png");
    return participant;
}
//# sourceMappingURL=chat.js.map
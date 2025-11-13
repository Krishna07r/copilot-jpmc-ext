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
exports.registerInlineCompletions = registerInlineCompletions;
const vscode = __importStar(require("vscode"));
function registerInlineCompletions(_context) {
    const provider = {
        async provideInlineCompletionItems(doc, position) {
            const line = doc.lineAt(position.line).text.slice(0, position.character).trimEnd();
            // TS/JS trigger: `jpmc:`
            if (/\bjpmc:$/.test(line)) {
                const snippet = new vscode.SnippetString(`// JPMC secure fetch
const resp = await fetch(process.env.SVC_URL + '/health', {
  method: 'GET',
  headers: {
    'X-Request-Id': crypto.randomUUID(),
    'X-Client': 'copilot-jpmc-ext'
  }
});
if (!resp.ok) throw new Error('Service unavailable');
const data = await resp.json();
$0`);
                const item = new vscode.InlineCompletionItem(snippet);
                item.range = new vscode.Range(position, position);
                return { items: [item] };
            }
            // Python trigger: `# jpmc:`
            if (/^#\s*jpmc:$/.test(line)) {
                const snippet = new vscode.SnippetString(`# JPMC secure fetch (requests)
import os, uuid, requests
resp = requests.get(os.environ.get("SVC_URL") + "/health", headers={
    "X-Request-Id": str(uuid.uuid4()),
    "X-Client": "copilot-jpmc-ext"
})
resp.raise_for_status()
data = resp.json()
$0`);
                const item = new vscode.InlineCompletionItem(snippet);
                item.range = new vscode.Range(position, position);
                return { items: [item] };
            }
            return { items: [] };
        }
    };
    return vscode.languages.registerInlineCompletionItemProvider([
        { language: 'typescript', pattern: '**/*.{ts,tsx}' },
        { language: 'javascript', pattern: '**/*.{js,jsx}' },
        { language: 'python', pattern: '**/*.py' }
    ], provider);
}
//# sourceMappingURL=inlineCompletions.js.map
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
exports.registerPolicyPanel = registerPolicyPanel;
const vscode = __importStar(require("vscode"));
function registerPolicyPanel(context) {
    return vscode.commands.registerCommand("copilotJpmc.openPolicies", async () => {
        const panel = vscode.window.createWebviewPanel("jpmcPolicies", "JPMC Engineering Policies", vscode.ViewColumn.Beside, { enableScripts: true });
        const mdUri = vscode.Uri.joinPath(context.extensionUri, "assets", "sample-policies.md");
        const md = (await vscode.workspace.fs.readFile(mdUri)).toString();
        panel.webview.html = `
      <!doctype html>
      <html>
      <body style="font-family: var(--vscode-font-family); padding:12px">
        <h2>Policies & Guardrails</h2>
        <pre>${'${md.replace(/</g,"&lt;")}'}</pre>
        <button id="copy">Copy PCI Checklist</button>
        <script>
          document.getElementById('copy').onclick = () =>
            navigator.clipboard.writeText('PCI: no PAN logs, TLS1.2+, vault secrets, no PII in telemetry');
        </script>
      </body>
      </html>`;
    });
}
//# sourceMappingURL=policyPanel.js.map
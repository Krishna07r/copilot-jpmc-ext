import * as vscode from 'vscode';

export function registerPolicyPanel(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("copilotJpmc.openPolicies", async () => {
    const panel = vscode.window.createWebviewPanel(
      "jpmcPolicies",
      "JPMC Engineering Policies",
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    const mdUri = vscode.Uri.joinPath(context.extensionUri, "assets", "sample-policies.md");
    const md = (await vscode.workspace.fs.readFile(mdUri)).toString();

    panel.webview.html = `
<!doctype html>
<html>
<body style="font-family: var(--vscode-font-family); padding:12px">
  <h2>Policies & Guardrails</h2>
  <pre>${md.replace(/</g, "&lt;")}</pre>
  <button id="copy">Copy PCI Checklist</button>
  <script>
    document.getElementById('copy').onclick = () =>
      navigator.clipboard.writeText('PCI: no PAN logs, TLS1.2+, vault secrets, no PII in telemetry');
  </script>
</body>
</html>`;
  });
}

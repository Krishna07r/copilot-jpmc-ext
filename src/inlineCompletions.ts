import * as vscode from 'vscode';

export function registerInlineCompletions(_context: vscode.ExtensionContext) {
  const provider: vscode.InlineCompletionItemProvider = {
    async provideInlineCompletionItems(doc, position) {
      const line = doc.lineAt(position.line).text.slice(0, position.character).trimEnd();

      // TS/JS trigger: `jpmc:`
      if (/\bjpmc:$/.test(line)) {
        const snippet = new vscode.SnippetString(
`// JPMC secure fetch
const resp = await fetch(process.env.SVC_URL + '/health', {
  method: 'GET',
  headers: {
    'X-Request-Id': crypto.randomUUID(),
    'X-Client': 'copilot-jpmc-ext'
  }
});
if (!resp.ok) throw new Error('Service unavailable');
const data = await resp.json();
$0`
        );
        const item = new vscode.InlineCompletionItem(snippet);
        item.range = new vscode.Range(position, position);
        return { items: [item] };
      }

      // Python trigger: `# jpmc:`
      if (/^#\s*jpmc:$/.test(line)) {
        const snippet = new vscode.SnippetString(
`# JPMC secure fetch (requests)
import os, uuid, requests
resp = requests.get(os.environ.get("SVC_URL") + "/health", headers={
    "X-Request-Id": str(uuid.uuid4()),
    "X-Client": "copilot-jpmc-ext"
})
resp.raise_for_status()
data = resp.json()
$0`
        );
        const item = new vscode.InlineCompletionItem(snippet);
        item.range = new vscode.Range(position, position);
        return { items: [item] };
      }

      return { items: [] };
    }
  };

  return vscode.languages.registerInlineCompletionItemProvider(
    [
      { language: 'typescript', pattern: '**/*.{ts,tsx}' },
      { language: 'javascript', pattern: '**/*.{js,jsx}' },
      { language: 'python',     pattern: '**/*.py' }
    ],
    provider
  );
}

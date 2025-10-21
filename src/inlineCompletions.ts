import * as vscode from 'vscode';

export function registerInlineCompletions(context: vscode.ExtensionContext) {
  const provider: vscode.InlineCompletionItemProvider = {
    async provideInlineCompletionItems(doc, position, contextIn, token) {
      const line = doc.lineAt(position.line).text.slice(0, position.character);
      if (/\bjpmc:$/.test(line.trim())) {
        const completion = new vscode.InlineCompletionItem(
`// JPMC secure fetch
const resp = await fetch(process.env.SVC_URL + '/health', {
  method: 'GET',
  headers: {
    'X-Request-Id': crypto.randomUUID(),
    'X-Client': 'copilot-jpmc-ext'
  }
});
if (!resp.ok) throw new Error('Service unavailable');`
        );
        completion.range = new vscode.Range(position, position);
        return { items: [completion] };
      }
      return { items: [] };
    }
  };
  return vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**/*.{ts,js}" }, provider
  );
}
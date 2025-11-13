import * as vscode from 'vscode';
import { queryInternalAPI } from './apiClient';
import { getPythonSymbols, listImports, grepInDoc, codeBlockWithContext } from './fileSearch';
import { highlightRanges, clearHighlights } from './highlight';

function toLowerTrim(s: string) { return (s ?? '').trim().toLowerCase(); }

function isListServices(text: string) {
  const t = toLowerTrim(text);
  return t === '' || /^list( all)?( services)?$/.test(t) || /\blist services\b/.test(t);
}

type SearchOpts = { caseSensitive: boolean; regex: boolean; max: number; query: string };

function parseSearch(raw: string): SearchOpts | null {
  const txt = (raw ?? '').trim();
  if (!txt) return null;

  const lower = txt.toLowerCase();
  let body = txt;
  if (lower.startsWith('search ')) body = txt.slice(7);
  else if (lower.startsWith('find ')) body = txt.slice(5);

  const parts = body.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const qs: string[] = [];
  let caseSensitive = false;
  let regex = false;
  let max = 50;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === '-s') caseSensitive = true;
    else if (p === '-i') caseSensitive = false;
    else if (p === '-re') regex = true;
    else if (p === '-n' && parts[i + 1]) {
      max = Math.max(1, parseInt(parts[++i], 10) || 50);
    } else {
      qs.push(p.replace(/^"|"$/g, ''));
    }
  }

  const query = qs.join(' ').trim();
  if (!query) return null;
  return { caseSensitive, regex, max, query };
}

// clickable link to jump to a specific location
function gotoLink(doc: vscode.TextDocument, line: number, col: number) {
  const args = encodeURIComponent(JSON.stringify({ uri: doc.uri.toString(), line, col }));
  return `[line ${line}, col ${col}](command:copilotJpmc.goto?${args})`;
}

export function registerJpmcChatParticipant(context: vscode.ExtensionContext) {
  const participant = vscode.chat.createChatParticipant(
    'jpmc',
    async (request, _ctx, stream, token) => {
      const raw = request.prompt ?? '';
      const text = raw.trim();

      try {
        // HELP
        if (toLowerTrim(text) === 'help' || text.trim() === '?') {
          stream.markdown(
            [
              '**JPMC Assistant – quick help**',
              '',
              '_Python file search_',
              '- `search <text>` · `find <text>` · just type words (e.g., `jwt decode`)',
              '- flags: `-s` (case-sensitive), `-i` (default), `-re` (regex), `-n 100` (limit)',
              '- `list functions` · `list classes` · `list imports`',
              '',
              '_Service catalog_',
              '- `list services` or keywords like `card auth`, `kyc`, `ledger`',
              ''
            ].join('\n')
          );
          return;
        }

        // If a Python file is active, default to "file search" behavior
        const editor = vscode.window.activeTextEditor;
        const isPy = editor?.document.languageId === 'python';

        if (isPy) {
          const doc = editor!.document;
          const lower = toLowerTrim(text);

          // simple lists
          if (/^list functions?$/i.test(lower)) {
            const syms = await getPythonSymbols(doc);
            if (syms.functions.length === 0) { stream.markdown('_No functions found._'); return; }
            const items = syms.functions
              .map(s => `- ${gotoLink(doc, s.range.start.line + 1, s.range.start.character + 1)} \`${s.name}\``)
              .join('\n');
            stream.markdown(`### Functions\n${items}\n`);
            return;
          }

          if (/^list classes?$/i.test(lower)) {
            const syms = await getPythonSymbols(doc);
            if (syms.classes.length === 0) { stream.markdown('_No classes found._'); return; }
            const items = syms.classes
              .map(s => `- ${gotoLink(doc, s.range.start.line + 1, s.range.start.character + 1)} \`${s.name}\``)
              .join('\n');
            stream.markdown(`### Classes\n${items}\n`);
            return;
          }

          if (/^list imports?$/i.test(lower)) {
            const imps = listImports(doc);
            if (imps.length === 0) { stream.markdown('_No imports found._'); return; }
            const items = imps
              .map(i => `- ${gotoLink(doc, i.line, 1)} \`${i.text}\``)
              .join('\n');
            stream.markdown(`### Imports\n${items}\n`);
            return;
          }

          // universal search: treat anything not clearly "services" as file search
          const svcHint = /\b(service|services|endpoint|endpoints|card|kyc|ledger)\b/i.test(text);
          const parsed =
            parseSearch(text) ?? (!svcHint ? { caseSensitive: false, regex: false, max: 50, query: text } : null);

          if (parsed) {
            const { caseSensitive, regex, max, query } = parsed;
            const hits = grepInDoc(doc, query, { caseSensitive, regex, max });
            if (hits.length === 0) {
              clearHighlights();
              stream.markdown(`_No matches for **${query}**._`);
              return;
            }

            // highlight all & reveal first
            highlightRanges(editor!, hits.map(h => h.range));

            // clickable list + context block
            const list = hits
              .slice(0, Math.min(50, hits.length))
              .map(h => `- ${gotoLink(doc, h.line, h.col)}: \`${h.text.trim()}\``)
              .join('\n');

            stream.markdown(
              `### Matches for \`${query}\` (${hits.length}${hits.length === max ? '+' : ''})\n${list}\n`
            );
            stream.markdown(codeBlockWithContext(doc, hits[0].line, 3));
            return;
          }
        } // <-- IMPORTANT: close the if (isPy) block before service catalog

        // ------ Service catalog (existing behavior) ------
        if (isListServices(text)) {
          const apiRes = await queryInternalAPI(
            { kind: 'serviceSearch', q: 'list services' },
            { isCancellationRequested: token.isCancellationRequested }
          );
          if (token.isCancellationRequested) return;

          if (apiRes.items.length === 0) {
            stream.markdown('No services are registered in the catalog.');
            return;
          }
          stream.markdown(
            '### Services\n' +
            apiRes.items.map(i => `- **${i.name}** → \`${i.owner}\` • ${i.description}`).join('\n') +
            '\n'
          );
          return;
        }

        const looksLikeSvc = /\b(service|services|endpoint|endpoints|find|search|card|kyc|ledger)\b/i.test(text);
        if (looksLikeSvc) {
          const repo = vscode.workspace.workspaceFolders?.[0]?.name ?? 'repo';
          stream.markdown(`Looking up **service contracts** in \`${repo}\`…\n`);

          const apiRes = await queryInternalAPI(
            { kind: 'serviceSearch', q: text },
            { isCancellationRequested: token.isCancellationRequested }
          );
          if (token.isCancellationRequested) return;

          if (apiRes.items.length === 0) {
            stream.markdown(
              [
                'No matches. Try one of these:',
                '- **CardAuth** – payments-platform (AuthN/Z for card flows)',
                '- **KYCProfile** – risk-kyc (KYC profiles & risk flags)',
                '- **LedgerWrite** – core-ledger (Idempotent write API)',
                '',
                'You can also type **`@jpmc list services`**.'
              ].join('\n')
            );
            return;
          }

          stream.markdown('### Matches\n\n');
          stream.markdown('\n' + apiRes.items.map(i => `- **${i.name}** → \`${i.owner}\` • ${i.description}`).join('\n') + '\n\n');

          const svcName = apiRes.items[0]?.name;
          if (svcName) {
            stream.markdown('Here’s a boilerplate client for the first match:\n\n');
            stream.markdown(
              [
                '```ts',
                "import axios from 'axios';",
                `export async function get${svcName}(id: string) {`,
                "  const r = await axios.get(process.env.SVC_URL + '/v1/resource/' + id, {",
                "    headers: { 'X-Request-Id': crypto.randomUUID() }",
                '  });',
                '  return r.data;',
                '}',
                '```',
                ''
              ].join('\n')
            );

            stream.markdown('**cURL example** (replace ID and SVC_URL):\n\n');
            stream.markdown(
              [
                '```bash',
                'curl -X GET "$SVC_URL/v1/resource/123" \\',
                '  -H "X-Request-Id: $(uuidgen)" \\',
                '  -H "Accept: application/json"',
                '```',
                ''
              ].join('\n')
            );
          }
          return;
        }

        // fallback
        const files = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**', 5);
        const toc = files.map(f => '- ' + vscode.workspace.asRelativePath(f.fsPath)).join('\n');
        stream.markdown(
          [
            'I found these docs in your workspace:',
            toc || '_No docs found_',
            '',
            'Type `@jpmc help` to see search commands.',
            ''
          ].join('\n')
        );
      } catch (err: any) {
        stream.markdown(
          [
            '⚠️ **Something went wrong while processing your request.**',
            'Please try again, or run `@jpmc help`.',
            '',
            '_Details for debugging: ' + (err?.message ?? String(err)) + '_'
          ].join('\n')
        );
      }
    }
  );

  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets/logo.png');
  return participant;
}

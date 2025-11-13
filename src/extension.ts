import * as vscode from 'vscode';
import { registerJpmcChatParticipant } from './chat';
import { registerInlineCompletions } from './inlineCompletions';
import { registerPolicyPanel } from './policyPanel';

export function activate(context: vscode.ExtensionContext) {
  const chatDisposable = registerJpmcChatParticipant(context);
  const inlineDisposable = registerInlineCompletions(context);
  const policyDisposable = registerPolicyPanel(context);

  // NEW: command link target used by chat to jump to a location
  // extension.ts (inside activate)
const gotoDisposable = vscode.commands.registerCommand('copilotJpmc.goto', async (args?: { uri?: string; line?: number; col?: number }) => {
  const { uri, line = 1, col = 1 } = args ?? {};
  const target = uri ? vscode.Uri.parse(uri) : vscode.window.activeTextEditor?.document.uri;
  if (!target) return;
  const doc = await vscode.workspace.openTextDocument(target);
  const editor = await vscode.window.showTextDocument(doc);
  const pos = new vscode.Position(Math.max(0, line - 1), Math.max(0, col - 1));
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
});
context.subscriptions.push(gotoDisposable);


  context.subscriptions.push(
    chatDisposable,
    inlineDisposable,
    policyDisposable,
    gotoDisposable
  );

  vscode.window.setStatusBarMessage('JPMC Copilot tools loaded', 3000);
}

export function deactivate() {}

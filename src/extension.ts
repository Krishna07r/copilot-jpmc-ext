import * as vscode from 'vscode';
import { registerJpmcChatParticipant } from './chat';
import { registerInlineCompletions } from './inlineCompletions';
import { registerPolicyPanel } from './policyPanel';

export function activate(context: vscode.ExtensionContext) {
  const chatDisposable = registerJpmcChatParticipant(context);
  const inlineDisposable = registerInlineCompletions(context);
  const policyDisposable = registerPolicyPanel(context);
  context.subscriptions.push(chatDisposable, inlineDisposable, policyDisposable);
  vscode.window.setStatusBarMessage("JPMC Copilot tools loaded", 3000);
}
export function deactivate() {}
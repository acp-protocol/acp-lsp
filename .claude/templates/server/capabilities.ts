/**
 * ACP Language Server - Capability Declaration
 * @acp:purpose Capabilities - Declares LSP features supported by the server
 * @acp:module "Server"
 */
import { InitializeResult, TextDocumentSyncKind, CodeActionKind } from 'vscode-languageserver';

export interface CapabilityOptions {
  hasWorkspaceFolderCapability: boolean;
  hasConfigurationCapability: boolean;
}

export function createCapabilities(options: CapabilityOptions): InitializeResult {
  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental,
        save: { includeText: true },
      },
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['@', ':', '"', '$', '.', ' '],
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.Refactor],
        resolveProvider: true,
      },
      codeLensProvider: { resolveProvider: true },
      documentFormattingProvider: true,
      renameProvider: { prepareProvider: true },
      foldingRangeProvider: true,
      semanticTokensProvider: {
        legend: {
          tokenTypes: ['namespace', 'type', 'class', 'parameter', 'variable', 'string', 'keyword', 'comment'],
          tokenModifiers: ['declaration', 'definition', 'readonly', 'deprecated'],
        },
        full: true,
        delta: true,
      },
      inlayHintProvider: { resolveProvider: true },
      workspace: {
        workspaceFolders: {
          supported: options.hasWorkspaceFolderCapability,
          changeNotifications: true,
        },
      },
    },
    serverInfo: { name: 'acp-language-server', version: '0.1.0' },
  };
}

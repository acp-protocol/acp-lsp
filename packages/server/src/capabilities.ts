/**
 * @acp:category("configuration")
 * @acp:agent-instructions("Server capability configuration and negotiation per LSP 3.17 specification")
 */

import {
  InitializeResult,
  TextDocumentSyncKind,
  SemanticTokensLegend,
  SemanticTokensOptions,
} from 'vscode-languageserver'
import { SERVER_NAME, SERVER_VERSION } from '@acp-lsp/shared'

/**
 * Options for capability creation
 */
export interface CapabilityOptions {
  /** Whether the client supports workspace folders */
  hasWorkspaceFolderCapability: boolean
  /** Whether the client supports workspace configuration */
  hasConfigurationCapability: boolean
}

/**
 * Semantic token types for ACP annotations
 */
export const semanticTokenTypes = [
  'comment',
  'keyword',
  'string',
  'number',
  'decorator',
  'function',
  'variable',
  'type',
  'namespace',
  'property',
] as const

/**
 * Semantic token modifiers for ACP annotations
 */
export const semanticTokenModifiers = [
  'declaration',
  'definition',
  'readonly',
  'deprecated',
  'documentation',
] as const

/**
 * Semantic tokens legend for the server
 */
export const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes: [...semanticTokenTypes],
  tokenModifiers: [...semanticTokenModifiers],
}

/**
 * Create semantic tokens options
 */
function createSemanticTokensOptions(): SemanticTokensOptions {
  return {
    legend: semanticTokensLegend,
    full: true,
    range: true,
  }
}

/**
 * Create the full set of server capabilities for LSP 3.17
 */
export function createCapabilities(options: CapabilityOptions): InitializeResult {
  return {
    capabilities: {
      // Text document synchronization
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental,
        save: {
          includeText: false,
        },
      },

      // Completion support
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['@', ':', '(', '"', "'"],
        workDoneProgress: true,
      },

      // Hover support
      hoverProvider: true,

      // Signature help (for annotation parameters)
      signatureHelpProvider: {
        triggerCharacters: ['(', ','],
        retriggerCharacters: [','],
      },

      // Go to definition
      definitionProvider: true,

      // Find references
      referencesProvider: true,

      // Document symbols (outline)
      documentSymbolProvider: true,

      // Workspace symbols (search)
      workspaceSymbolProvider: true,

      // Code actions (quick fixes, refactoring)
      codeActionProvider: {
        codeActionKinds: [
          'quickfix',
          'refactor',
          'refactor.extract',
          'refactor.inline',
          'refactor.rewrite',
          'source',
          'source.organizeImports',
          'source.fixAll',
        ],
        resolveProvider: true,
      },

      // Code lens (inline actions)
      codeLensProvider: {
        resolveProvider: true,
      },

      // Document formatting
      documentFormattingProvider: true,

      // Document range formatting
      documentRangeFormattingProvider: true,

      // Rename support
      renameProvider: {
        prepareProvider: true,
      },

      // Folding ranges
      foldingRangeProvider: true,

      // Selection ranges
      selectionRangeProvider: true,

      // Semantic tokens
      semanticTokensProvider: createSemanticTokensOptions(),

      // Inlay hints (inline type information)
      inlayHintProvider: {
        resolveProvider: true,
      },

      // Document links (clickable URLs in annotations)
      documentLinkProvider: {
        resolveProvider: true,
      },

      // Document color (for color annotations if any)
      colorProvider: false,

      // Diagnostic provider (push diagnostics)
      diagnosticProvider: {
        interFileDependencies: true,
        workspaceDiagnostics: false,
      },

      // Workspace capabilities
      workspace: {
        workspaceFolders: options.hasWorkspaceFolderCapability
          ? {
              supported: true,
              changeNotifications: true,
            }
          : undefined,
        fileOperations: {
          didCreate: {
            filters: [
              { pattern: { glob: '**/*.{ts,tsx,js,jsx,py,rs,go,java,cs,cpp,c,h}' } },
              { pattern: { glob: '**/.acp.config.json' } },
              { pattern: { glob: '**/acp.config.json' } },
            ],
          },
          didRename: {
            filters: [
              { pattern: { glob: '**/*.{ts,tsx,js,jsx,py,rs,go,java,cs,cpp,c,h}' } },
            ],
          },
          didDelete: {
            filters: [
              { pattern: { glob: '**/*.{ts,tsx,js,jsx,py,rs,go,java,cs,cpp,c,h}' } },
            ],
          },
        },
      },
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  }
}

/**
 * Get a minimal set of capabilities (for testing or degraded mode)
 */
export function getMinimalCapabilities(): InitializeResult {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  }
}
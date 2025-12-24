import { describe, it, expect } from 'vitest'
import { TextDocumentSyncKind } from 'vscode-languageserver'
import {
  createCapabilities,
  getMinimalCapabilities,
  semanticTokenTypes,
  semanticTokenModifiers,
  semanticTokensLegend,
  type CapabilityOptions,
} from '../../src/capabilities.js'
import { SERVER_NAME, SERVER_VERSION } from '@acp-lsp/shared'

describe('capabilities', () => {
  describe('semanticTokenTypes', () => {
    it('should export all expected token types', () => {
      expect(semanticTokenTypes).toContain('comment')
      expect(semanticTokenTypes).toContain('keyword')
      expect(semanticTokenTypes).toContain('string')
      expect(semanticTokenTypes).toContain('number')
      expect(semanticTokenTypes).toContain('decorator')
      expect(semanticTokenTypes).toContain('function')
      expect(semanticTokenTypes).toContain('variable')
      expect(semanticTokenTypes).toContain('type')
      expect(semanticTokenTypes).toContain('namespace')
      expect(semanticTokenTypes).toContain('property')
    })

    it('should have exactly 10 token types', () => {
      expect(semanticTokenTypes).toHaveLength(10)
    })
  })

  describe('semanticTokenModifiers', () => {
    it('should export all expected modifiers', () => {
      expect(semanticTokenModifiers).toContain('declaration')
      expect(semanticTokenModifiers).toContain('definition')
      expect(semanticTokenModifiers).toContain('readonly')
      expect(semanticTokenModifiers).toContain('deprecated')
      expect(semanticTokenModifiers).toContain('documentation')
    })

    it('should have exactly 5 modifiers', () => {
      expect(semanticTokenModifiers).toHaveLength(5)
    })
  })

  describe('semanticTokensLegend', () => {
    it('should contain all token types', () => {
      expect(semanticTokensLegend.tokenTypes).toEqual([...semanticTokenTypes])
    })

    it('should contain all token modifiers', () => {
      expect(semanticTokensLegend.tokenModifiers).toEqual([...semanticTokenModifiers])
    })
  })

  describe('createCapabilities', () => {
    const fullOptions: CapabilityOptions = {
      hasWorkspaceFolderCapability: true,
      hasConfigurationCapability: true,
    }

    const minimalOptions: CapabilityOptions = {
      hasWorkspaceFolderCapability: false,
      hasConfigurationCapability: false,
    }

    describe('text document sync', () => {
      it('should support open/close notifications', () => {
        const result = createCapabilities(fullOptions)
        const sync = result.capabilities.textDocumentSync
        expect(sync).toBeDefined()
        expect(typeof sync).toBe('object')
        if (typeof sync === 'object' && sync !== null) {
          expect(sync.openClose).toBe(true)
        }
      })

      it('should use incremental sync', () => {
        const result = createCapabilities(fullOptions)
        const sync = result.capabilities.textDocumentSync
        if (typeof sync === 'object' && sync !== null) {
          expect(sync.change).toBe(TextDocumentSyncKind.Incremental)
        }
      })

      it('should configure save without including text', () => {
        const result = createCapabilities(fullOptions)
        const sync = result.capabilities.textDocumentSync
        if (typeof sync === 'object' && sync !== null) {
          expect(sync.save).toEqual({ includeText: false })
        }
      })
    })

    describe('completion provider', () => {
      it('should enable completion with resolve', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.completionProvider).toBeDefined()
        expect(result.capabilities.completionProvider?.resolveProvider).toBe(true)
      })

      it('should set trigger characters', () => {
        const result = createCapabilities(fullOptions)
        const triggers = result.capabilities.completionProvider?.triggerCharacters
        expect(triggers).toContain('@')
        expect(triggers).toContain(':')
        expect(triggers).toContain('(')
        expect(triggers).toContain('"')
        expect(triggers).toContain("'")
      })

      it('should enable work done progress', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.completionProvider?.workDoneProgress).toBe(true)
      })
    })

    describe('hover provider', () => {
      it('should enable hover', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.hoverProvider).toBe(true)
      })
    })

    describe('signature help provider', () => {
      it('should set trigger and retrigger characters', () => {
        const result = createCapabilities(fullOptions)
        const sig = result.capabilities.signatureHelpProvider
        expect(sig).toBeDefined()
        expect(sig?.triggerCharacters).toContain('(')
        expect(sig?.triggerCharacters).toContain(',')
        expect(sig?.retriggerCharacters).toContain(',')
      })
    })

    describe('navigation providers', () => {
      it('should enable definition provider', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.definitionProvider).toBe(true)
      })

      it('should enable references provider', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.referencesProvider).toBe(true)
      })

      it('should enable document symbols', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.documentSymbolProvider).toBe(true)
      })

      it('should enable workspace symbols', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.workspaceSymbolProvider).toBe(true)
      })
    })

    describe('code action provider', () => {
      it('should enable with resolve', () => {
        const result = createCapabilities(fullOptions)
        const provider = result.capabilities.codeActionProvider
        expect(provider).toBeDefined()
        if (typeof provider === 'object' && provider !== null) {
          expect(provider.resolveProvider).toBe(true)
        }
      })

      it('should support expected code action kinds', () => {
        const result = createCapabilities(fullOptions)
        const provider = result.capabilities.codeActionProvider
        if (typeof provider === 'object' && provider !== null) {
          expect(provider.codeActionKinds).toContain('quickfix')
          expect(provider.codeActionKinds).toContain('refactor')
          expect(provider.codeActionKinds).toContain('source.fixAll')
        }
      })
    })

    describe('code lens provider', () => {
      it('should enable with resolve', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.codeLensProvider).toBeDefined()
        expect(result.capabilities.codeLensProvider?.resolveProvider).toBe(true)
      })
    })

    describe('formatting providers', () => {
      it('should enable document formatting', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.documentFormattingProvider).toBe(true)
      })

      it('should enable range formatting', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.documentRangeFormattingProvider).toBe(true)
      })
    })

    describe('rename provider', () => {
      it('should enable with prepare support', () => {
        const result = createCapabilities(fullOptions)
        const provider = result.capabilities.renameProvider
        expect(provider).toBeDefined()
        if (typeof provider === 'object' && provider !== null) {
          expect(provider.prepareProvider).toBe(true)
        }
      })
    })

    describe('folding and selection', () => {
      it('should enable folding ranges', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.foldingRangeProvider).toBe(true)
      })

      it('should enable selection ranges', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.selectionRangeProvider).toBe(true)
      })
    })

    describe('semantic tokens', () => {
      it('should include semantic tokens legend', () => {
        const result = createCapabilities(fullOptions)
        const provider = result.capabilities.semanticTokensProvider
        expect(provider).toBeDefined()
        if (provider && 'legend' in provider) {
          expect(provider.legend.tokenTypes).toHaveLength(10)
          expect(provider.legend.tokenModifiers).toHaveLength(5)
        }
      })

      it('should enable full and range modes', () => {
        const result = createCapabilities(fullOptions)
        const provider = result.capabilities.semanticTokensProvider
        if (provider && 'full' in provider) {
          expect(provider.full).toBe(true)
          expect(provider.range).toBe(true)
        }
      })
    })

    describe('inlay hints', () => {
      it('should enable with resolve', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.inlayHintProvider).toBeDefined()
        if (typeof result.capabilities.inlayHintProvider === 'object') {
          expect(result.capabilities.inlayHintProvider.resolveProvider).toBe(true)
        }
      })
    })

    describe('document links', () => {
      it('should enable with resolve', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.documentLinkProvider).toBeDefined()
        expect(result.capabilities.documentLinkProvider?.resolveProvider).toBe(true)
      })
    })

    describe('color provider', () => {
      it('should be disabled', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.colorProvider).toBe(false)
      })
    })

    describe('diagnostic provider', () => {
      it('should enable with inter-file dependencies', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.diagnosticProvider).toBeDefined()
        if (result.capabilities.diagnosticProvider) {
          expect(result.capabilities.diagnosticProvider.interFileDependencies).toBe(true)
          expect(result.capabilities.diagnosticProvider.workspaceDiagnostics).toBe(false)
        }
      })
    })

    describe('workspace capabilities', () => {
      it('should enable workspace folders when client supports it', () => {
        const result = createCapabilities(fullOptions)
        expect(result.capabilities.workspace?.workspaceFolders).toBeDefined()
        expect(result.capabilities.workspace?.workspaceFolders?.supported).toBe(true)
        expect(result.capabilities.workspace?.workspaceFolders?.changeNotifications).toBe(true)
      })

      it('should not enable workspace folders when client lacks support', () => {
        const result = createCapabilities(minimalOptions)
        expect(result.capabilities.workspace?.workspaceFolders).toBeUndefined()
      })

      it('should configure file operation filters', () => {
        const result = createCapabilities(fullOptions)
        const fileOps = result.capabilities.workspace?.fileOperations
        expect(fileOps).toBeDefined()
        expect(fileOps?.didCreate?.filters).toHaveLength(3)
        expect(fileOps?.didRename?.filters).toHaveLength(1)
        expect(fileOps?.didDelete?.filters).toHaveLength(1)
      })
    })

    describe('server info', () => {
      it('should include server name and version', () => {
        const result = createCapabilities(fullOptions)
        expect(result.serverInfo?.name).toBe(SERVER_NAME)
        expect(result.serverInfo?.version).toBe(SERVER_VERSION)
      })
    })
  })

  describe('getMinimalCapabilities', () => {
    it('should return minimal text document sync', () => {
      const result = getMinimalCapabilities()
      expect(result.capabilities.textDocumentSync).toBe(TextDocumentSyncKind.Incremental)
    })

    it('should enable hover only', () => {
      const result = getMinimalCapabilities()
      expect(result.capabilities.hoverProvider).toBe(true)
    })

    it('should disable advanced providers', () => {
      const result = getMinimalCapabilities()
      expect(result.capabilities.completionProvider).toBeUndefined()
      expect(result.capabilities.definitionProvider).toBeUndefined()
      expect(result.capabilities.referencesProvider).toBeUndefined()
    })

    it('should include diagnostic provider with limited features', () => {
      const result = getMinimalCapabilities()
      expect(result.capabilities.diagnosticProvider).toBeDefined()
      expect(result.capabilities.diagnosticProvider?.interFileDependencies).toBe(false)
      expect(result.capabilities.diagnosticProvider?.workspaceDiagnostics).toBe(false)
    })

    it('should include server info', () => {
      const result = getMinimalCapabilities()
      expect(result.serverInfo?.name).toBe(SERVER_NAME)
      expect(result.serverInfo?.version).toBe(SERVER_VERSION)
    })
  })
})

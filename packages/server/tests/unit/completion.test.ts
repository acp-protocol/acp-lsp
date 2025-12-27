import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver'
import { CompletionProvider } from '../../src/providers/completion.js'
import type { DocumentManager, DocumentMetadata } from '../../src/documents/manager.js'
import type { Logger } from '../../src/utils/logger.js'

/**
 * Create a mock DocumentManager
 */
function createMockDocumentManager(documents: Map<string, TextDocument> = new Map()): DocumentManager {
  const metadata = new Map<string, DocumentMetadata>()

  return {
    get: vi.fn((uri: string) => documents.get(uri)),
    all: vi.fn(() => Array.from(documents.values())),
    getMetadata: vi.fn((uri: string) => metadata.get(uri)),
    updateMetadata: vi.fn((uri: string, update: Partial<DocumentMetadata>) => {
      const existing = metadata.get(uri)
      if (existing) {
        metadata.set(uri, { ...existing, ...update })
      }
    }),
    initializeDocument: vi.fn((doc: TextDocument) => {
      const uri = doc.uri
      const isAcpConfig = uri.includes('.acp.config.json')
      const isAcpVars = uri.includes('.acp.vars.json')
      const isAcpCache = uri.includes('.acp.cache.json')
      const meta: DocumentMetadata = {
        uri,
        language: 'typescript',
        hasAnnotations: false,
        isAcpConfig,
        isAcpCache,
        isAcpVars,
        version: 1,
      }
      metadata.set(uri, meta)
      return meta
    }),
  } as unknown as DocumentManager
}

/**
 * Create a mock Logger
 */
function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(),
  } as unknown as Logger
}

/**
 * Create a TextDocument
 */
function createDocument(content: string, uri: string = 'file:///test.ts'): TextDocument {
  const languageId = uri.endsWith('.json') ? 'json' : 'typescript'
  return TextDocument.create(uri, languageId, 1, content)
}

/**
 * Get position at end of content
 */
function getEndPosition(doc: TextDocument) {
  return doc.positionAt(doc.getText().length)
}

describe('CompletionProvider', () => {
  let documentManager: DocumentManager
  let logger: Logger
  let provider: CompletionProvider

  beforeEach(() => {
    documentManager = createMockDocumentManager()
    logger = createMockLogger()
    provider = new CompletionProvider(documentManager, logger)
  })

  describe('namespace completions', () => {
    it('should provide completions after @acp:', () => {
      const content = '// @acp:'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      })

      expect(Array.isArray(result)).toBe(true)
      const items = result as ReturnType<typeof provider.onCompletion>
      expect(items.length).toBeGreaterThan(20) // All namespaces
    })

    it('should filter completions by prefix', () => {
      const content = '// @acp:loc'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      expect(Array.isArray(result)).toBe(true)
      const labels = (result as { label: string }[]).map((i) => i.label)
      expect(labels).toContain('lock')
      expect(labels).toContain('lock-reason')
      expect(labels).not.toContain('purpose')
    })

    it('should include documentation for namespaces', () => {
      const content = '// @acp:'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      const lockItem = (result as { label: string; documentation?: unknown }[]).find((i) => i.label === 'lock')
      expect(lockItem).toBeDefined()
      expect(lockItem?.documentation).toBeDefined()
    })

    it('should use snippet format for namespaces requiring values', () => {
      const content = '// @acp:'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      const purposeItem = (result as { label: string; insertTextFormat?: number }[]).find(
        (i) => i.label === 'purpose'
      )
      expect(purposeItem?.insertTextFormat).toBe(InsertTextFormat.Snippet)
    })

    it('should not use snippet for inline markers without required values', () => {
      const content = '// @acp:'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      const criticalItem = (result as { label: string; insertText?: string }[]).find(
        (i) => i.label === 'critical'
      )
      expect(criticalItem?.insertText).toBe('critical')
    })

    it('should provide completions after @ trigger', () => {
      const content = '// @'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      expect(Array.isArray(result)).toBe(true)
      expect((result as unknown[]).length).toBeGreaterThan(0)
    })

    it('should categorize namespaces correctly', () => {
      const content = '// @acp:'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      const purposeItem = (result as { label: string; detail?: string }[]).find((i) => i.label === 'purpose')
      expect(purposeItem?.detail).toContain('File-level')

      const lockItem = (result as { label: string; detail?: string }[]).find((i) => i.label === 'lock')
      expect(lockItem?.detail).toContain('Constraint')
    })
  })

  describe('lock level completions', () => {
    it('should provide lock levels after @acp:lock ', () => {
      const content = '// @acp:lock '
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      expect(Array.isArray(result)).toBe(true)
      const labels = (result as { label: string }[]).map((i) => i.label)
      expect(labels).toContain('frozen')
      expect(labels).toContain('restricted')
      expect(labels).toContain('normal')
      expect(labels).toContain('experimental')
    })

    it('should order lock levels by severity', () => {
      const content = '// @acp:lock '
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      const sortTexts = (result as { sortText?: string }[]).map((i) => i.sortText)
      // First item should have lowest sortText
      expect(sortTexts[0]).toBe('00')
    })

    it('should include severity in lock level documentation', () => {
      const content = '// @acp:lock '
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      const frozenItem = (result as { label: string; documentation?: { value?: string } }[]).find(
        (i) => i.label === 'frozen'
      )
      expect(frozenItem?.documentation?.value).toContain('Severity')
    })
  })

  describe('layer completions', () => {
    it('should provide layer completions after @acp:layer("', () => {
      const content = '// @acp:layer("'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      expect(Array.isArray(result)).toBe(true)
      const labels = (result as { label: string }[]).map((i) => i.label)
      expect(labels).toContain('handler')
      expect(labels).toContain('service')
      expect(labels).toContain('repository')
    })
  })

  describe('stability completions', () => {
    it('should provide stability completions after @acp:stability("', () => {
      const content = '// @acp:stability("'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      expect(Array.isArray(result)).toBe(true)
      const labels = (result as { label: string }[]).map((i) => i.label)
      expect(labels).toContain('stable')
      expect(labels).toContain('experimental')
      expect(labels).toContain('deprecated')
    })
  })

  describe('variable completions', () => {
    it('should provide variable completions after $', () => {
      const content = '// @acp:ref($'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      expect(Array.isArray(result)).toBe(true)
      // Should at least have built-in variables
      const labels = (result as { label: string }[]).map((i) => i.label)
      expect(labels).toContain('FILE')
      expect(labels).toContain('LINE')
    })

    it('should provide modifier completions after $VAR.', () => {
      const content = '// @acp:ref($CONFIG.'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      expect(Array.isArray(result)).toBe(true)
      const labels = (result as { label: string }[]).map((i) => i.label)
      expect(labels).toContain('full')
      expect(labels).toContain('ref')
      expect(labels).toContain('signature')
    })

    it('should include variables from .acp.vars.json', () => {
      const varsContent = '{"variables": {"API_KEY": "secret123", "BASE_URL": "https://api.example.com"}}'
      const varsDoc = createDocument(varsContent, 'file:///project/.acp.vars.json')
      const testDoc = createDocument('// @acp:ref($', 'file:///project/test.ts')

      const documents = new Map([
        [varsDoc.uri, varsDoc],
        [testDoc.uri, testDoc],
      ])
      documentManager = createMockDocumentManager(documents)
      // Initialize the vars document metadata
      ;(documentManager.initializeDocument as ReturnType<typeof vi.fn>)(varsDoc)

      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: testDoc.uri },
        position: getEndPosition(testDoc),
      }) as ReturnType<typeof provider.onCompletion>

      const labels = (result as { label: string }[]).map((i) => i.label)
      expect(labels).toContain('API_KEY')
      expect(labels).toContain('BASE_URL')
    })
  })

  describe('JSON completions', () => {
    it('should provide config property completions for .acp.config.json', () => {
      const content = '{'
      const doc = createDocument(content, 'file:///project/.acp.config.json')
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      // Initialize metadata
      ;(documentManager.initializeDocument as ReturnType<typeof vi.fn>)(doc)

      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      expect(Array.isArray(result)).toBe(true)
      const labels = (result as { label: string }[]).map((i) => i.label)
      expect(labels).toContain('version')
      expect(labels).toContain('include')
      expect(labels).toContain('exclude')
    })

    it('should provide vars property completions for .acp.vars.json', () => {
      const content = '{'
      const doc = createDocument(content, 'file:///project/.acp.vars.json')
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      // Initialize metadata
      ;(documentManager.initializeDocument as ReturnType<typeof vi.fn>)(doc)

      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      expect(Array.isArray(result)).toBe(true)
      const labels = (result as { label: string }[]).map((i) => i.label)
      expect(labels).toContain('variables')
    })
  })

  describe('completion resolve', () => {
    it('should add detailed documentation on resolve', () => {
      const item = {
        label: 'lock',
        data: { namespace: 'lock' },
      }

      const resolved = provider.onCompletionResolve(item)

      expect(resolved.documentation).toBeDefined()
      if (typeof resolved.documentation === 'object' && 'value' in resolved.documentation) {
        expect(resolved.documentation.value).toContain('Example')
      }
    })
  })

  describe('no completions', () => {
    it('should return empty array when document not found', () => {
      const result = provider.onCompletion({
        textDocument: { uri: 'file:///nonexistent.ts' },
        position: { line: 0, character: 0 },
      })

      expect(result).toEqual([])
    })

    it('should return empty array for non-ACP context', () => {
      const content = 'const x = 1;'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      })

      expect(result).toEqual([])
    })
  })

  describe('completion item properties', () => {
    it('should use correct CompletionItemKind for namespaces', () => {
      const content = '// @acp:'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      const purposeItem = (result as { label: string; kind?: number }[]).find((i) => i.label === 'purpose')
      expect(purposeItem?.kind).toBe(CompletionItemKind.Keyword)
    })

    it('should use correct CompletionItemKind for lock levels', () => {
      const content = '// @acp:lock '
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      const frozenItem = (result as { label: string; kind?: number }[]).find((i) => i.label === 'frozen')
      expect(frozenItem?.kind).toBe(CompletionItemKind.EnumMember)
    })

    it('should use correct CompletionItemKind for variables', () => {
      const content = '// @acp:ref($'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new CompletionProvider(documentManager, logger)

      const result = provider.onCompletion({
        textDocument: { uri: doc.uri },
        position: getEndPosition(doc),
      }) as ReturnType<typeof provider.onCompletion>

      const fileItem = (result as { label: string; kind?: number }[]).find((i) => i.label === 'FILE')
      expect(fileItem?.kind).toBe(CompletionItemKind.Constant)
    })
  })
})

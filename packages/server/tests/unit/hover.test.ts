import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { MarkupKind } from 'vscode-languageserver'
import { HoverProvider } from '../../src/providers/hover.js'
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

describe('HoverProvider', () => {
  let documentManager: DocumentManager
  let logger: Logger
  let provider: HoverProvider

  beforeEach(() => {
    documentManager = createMockDocumentManager()
    logger = createMockLogger()
    provider = new HoverProvider(documentManager, logger)
  })

  describe('annotation hover', () => {
    it('should return hover for @acp:lock annotation', () => {
      const content = '// @acp:lock("frozen")'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 10 }, // On 'lock'
      })

      expect(result).not.toBeNull()
      expect(result?.contents).toBeDefined()
      if (typeof result?.contents === 'object' && 'kind' in result.contents) {
        expect(result.contents.kind).toBe(MarkupKind.Markdown)
        expect(result.contents.value).toContain('@acp:lock')
        expect(result.contents.value).toContain('frozen')
      }
    })

    it('should display lock level visualization', () => {
      const content = '// @acp:lock("frozen")'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 10 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        // Should contain the ASCII hierarchy
        expect(result.contents.value).toContain('Restriction Hierarchy')
        expect(result.contents.value).toContain('█')
        expect(result.contents.value).toContain('CURRENT')
      }
    })

    it('should return hover for @acp:purpose annotation', () => {
      const content = '// @acp:purpose("Authentication service")'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 10 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('@acp:purpose')
        expect(result.contents.value).toContain('Authentication service')
        expect(result.contents.value).toContain('File-level')
      }
    })

    it('should return hover for @acp:fn annotation with description', () => {
      const content = '// @acp:fn("validateToken") - Validates JWT tokens'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 10 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('@acp:fn')
        expect(result.contents.value).toContain('validateToken')
        expect(result.contents.value).toContain('Validates JWT tokens')
      }
    })

    it('should return hover for @acp:layer annotation', () => {
      const content = '// @acp:layer("service")'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 10 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('@acp:layer')
        expect(result.contents.value).toContain('service')
        expect(result.contents.value).toContain('Domain business logic')
      }
    })

    it('should return hover for @acp:stability annotation', () => {
      const content = '// @acp:stability("experimental")'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 15 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('@acp:stability')
        expect(result.contents.value).toContain('experimental')
        expect(result.contents.value).toContain('may change without notice')
      }
    })

    it('should show warning for unknown namespace', () => {
      const content = '// @acp:unknown-namespace("value")'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 10 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('Unknown namespace')
      }
    })

    it('should return hover for inline annotations without values', () => {
      const content = '// @acp:critical'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 10 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('@acp:critical')
        expect(result.contents.value).toContain('Inline')
      }
    })

    it('should return hover with AI guidance when available', () => {
      const content = '// @acp:lock("frozen")'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 10 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('AI Guidance')
      }
    })
  })

  describe('variable hover', () => {
    it('should return hover for built-in variable $FILE', () => {
      const content = '// @acp:ref($FILE)'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 13 }, // On $FILE
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('$FILE')
        expect(result.contents.value).toContain('Built-in')
        expect(result.contents.value).toContain('file path')
      }
    })

    it('should return hover for built-in variable $FUNCTION', () => {
      const content = '// $FUNCTION.ref'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 5 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('$FUNCTION')
        expect(result.contents.value).toContain('enclosing function')
      }
    })

    it('should show warning for undefined variable', () => {
      const content = '// @acp:ref($UNDEFINED_VAR)'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 15 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('Undefined variable')
        expect(result.contents.value).toContain('.acp.vars.json')
      }
    })

    it('should resolve variable from .acp.vars.json', () => {
      const varsContent = '{"variables": {"API_KEY": "secret123"}}'
      const varsDoc = createDocument(varsContent, 'file:///project/.acp.vars.json')
      const testDoc = createDocument('// @acp:ref($API_KEY)', 'file:///project/test.ts')

      const documents = new Map([
        [varsDoc.uri, varsDoc],
        [testDoc.uri, testDoc],
      ])
      documentManager = createMockDocumentManager(documents)
      // Initialize the vars document metadata
      ;(documentManager.initializeDocument as ReturnType<typeof vi.fn>)(varsDoc)

      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: testDoc.uri },
        position: { line: 0, character: 15 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('$API_KEY')
        expect(result.contents.value).toContain('secret123')
      }
    })

    it('should show modifier description for variable with modifier', () => {
      const content = '// $CONFIG.full'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 5 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        // Variable is undefined but we should still see the full reference
        expect(result.contents.value).toContain('$CONFIG.full')
      }
    })
  })

  describe('hover range', () => {
    it('should return correct range for annotation', () => {
      const content = '// @acp:lock("frozen")'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 10 },
      })

      expect(result).not.toBeNull()
      expect(result?.range).toBeDefined()
      expect(result?.range?.start.line).toBe(0)
      expect(result?.range?.end.line).toBe(0)
    })

    it('should return correct range for variable', () => {
      const content = '// $FILE'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 5 },
      })

      expect(result).not.toBeNull()
      expect(result?.range).toBeDefined()
      if (result?.range) {
        expect(result.range.start.character).toBe(3) // Position of $
        expect(result.range.end.character).toBe(8) // End of FILE
      }
    })
  })

  describe('no hover', () => {
    it('should return null when document not found', () => {
      const result = provider.onHover({
        textDocument: { uri: 'file:///nonexistent.ts' },
        position: { line: 0, character: 0 },
      })

      expect(result).toBeNull()
    })

    it('should return null for non-ACP content', () => {
      const content = 'const x = 1;'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 5 },
      })

      expect(result).toBeNull()
    })

    it('should return null when cursor is outside annotation', () => {
      const content = '// some text @acp:lock("frozen") more text'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      // Position at "some"
      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 4 },
      })

      expect(result).toBeNull()
    })

    it('should return null for empty document', () => {
      const content = ''
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 0, character: 0 },
      })

      expect(result).toBeNull()
    })
  })

  describe('all lock levels', () => {
    const lockLevels = [
      'frozen',
      'restricted',
      'approval-required',
      'tests-required',
      'docs-required',
      'review-required',
      'normal',
      'experimental',
    ]

    lockLevels.forEach((level) => {
      it(`should display correct info for lock level: ${level}`, () => {
        const content = `// @acp:lock("${level}")`
        const doc = createDocument(content)
        const documents = new Map([[doc.uri, doc]])
        documentManager = createMockDocumentManager(documents)
        provider = new HoverProvider(documentManager, logger)

        const result = provider.onHover({
          textDocument: { uri: doc.uri },
          position: { line: 0, character: 10 },
        })

        expect(result).not.toBeNull()
        if (typeof result?.contents === 'object' && 'value' in result.contents) {
          expect(result.contents.value).toContain(level)
          expect(result.contents.value).toContain('CURRENT')
        }
      })
    })
  })

  describe('all annotation categories', () => {
    const testCases = [
      { ns: 'purpose', category: 'File-level' },
      { ns: 'module', category: 'File-level' },
      { ns: 'domain', category: 'File-level' },
      { ns: 'fn', category: 'Symbol-level' },
      { ns: 'class', category: 'Symbol-level' },
      { ns: 'method', category: 'Symbol-level' },
      { ns: 'lock', category: 'Constraint' },
      { ns: 'style', category: 'Constraint' },
      { ns: 'critical', category: 'Inline' },
      { ns: 'todo', category: 'Inline' },
    ]

    testCases.forEach(({ ns, category }) => {
      it(`should show correct category for @acp:${ns}`, () => {
        const content = `// @acp:${ns}("value")`
        const doc = createDocument(content)
        const documents = new Map([[doc.uri, doc]])
        documentManager = createMockDocumentManager(documents)
        provider = new HoverProvider(documentManager, logger)

        const result = provider.onHover({
          textDocument: { uri: doc.uri },
          position: { line: 0, character: 10 },
        })

        expect(result).not.toBeNull()
        if (typeof result?.contents === 'object' && 'value' in result.contents) {
          expect(result.contents.value).toContain(category)
        }
      })
    })
  })

  describe('multiline support', () => {
    it('should handle annotation on second line', () => {
      const content = 'const x = 1;\n// @acp:lock("frozen")'
      const doc = createDocument(content)
      const documents = new Map([[doc.uri, doc]])
      documentManager = createMockDocumentManager(documents)
      provider = new HoverProvider(documentManager, logger)

      const result = provider.onHover({
        textDocument: { uri: doc.uri },
        position: { line: 1, character: 10 },
      })

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('@acp:lock')
      }
    })
  })
})
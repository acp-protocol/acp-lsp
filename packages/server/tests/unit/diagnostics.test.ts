import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { Connection } from 'vscode-languageserver'
import { DiagnosticSeverity } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { DiagnosticsProvider, ACPDiagnosticCode } from '../../src/providers/diagnostics.js'
import type { DocumentManager } from '../../src/documents/manager.js'
import type { Logger } from '../../src/utils/logger.js'

/**
 * Create a mock Connection for testing
 */
function createMockConnection(): Connection {
  return {
    sendDiagnostics: vi.fn(),
  } as unknown as Connection
}

/**
 * Create a mock DocumentManager for testing
 */
function createMockDocumentManager(): DocumentManager {
  return {} as unknown as DocumentManager
}

/**
 * Create a mock Logger for testing
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
 * Helper to create a TextDocument
 */
function createDocument(content: string, uri: string = 'file:///test.ts'): TextDocument {
  const languageId = uri.endsWith('.json') ? 'json' : 'typescript'
  return TextDocument.create(uri, languageId, 1, content)
}

describe('DiagnosticsProvider', () => {
  let connection: Connection
  let documentManager: DocumentManager
  let logger: Logger
  let provider: DiagnosticsProvider

  beforeEach(() => {
    connection = createMockConnection()
    documentManager = createMockDocumentManager()
    logger = createMockLogger()
    provider = new DiagnosticsProvider(connection, documentManager, logger)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('ACPDiagnosticCode', () => {
    it('should have correct diagnostic codes', () => {
      expect(ACPDiagnosticCode.UnknownAnnotationType).toBe('acp-unknown-type')
      expect(ACPDiagnosticCode.InvalidAnnotationSyntax).toBe('acp-invalid-syntax')
      expect(ACPDiagnosticCode.MissingValue).toBe('acp-missing-value')
      expect(ACPDiagnosticCode.InvalidValue).toBe('acp-invalid-value')
      expect(ACPDiagnosticCode.DuplicateAnnotation).toBe('acp-duplicate')
    })
  })

  describe('documentManager getter', () => {
    it('should return the document manager', () => {
      expect(provider.documentManager).toBe(documentManager)
    })
  })

  describe('validate with debouncing', () => {
    it('should debounce validation calls', async () => {
      const doc = createDocument('// @acp:category("test")')

      provider.validate(doc, 100)
      provider.validate(doc, 100)
      provider.validate(doc, 100)

      expect(connection.sendDiagnostics).not.toHaveBeenCalled()

      vi.advanceTimersByTime(150)

      expect(connection.sendDiagnostics).toHaveBeenCalledTimes(1)
    })

    it('should use default debounce of 250ms', () => {
      const doc = createDocument('// @acp:category("test")')

      provider.validate(doc)

      vi.advanceTimersByTime(200)
      expect(connection.sendDiagnostics).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(connection.sendDiagnostics).toHaveBeenCalledTimes(1)
    })

    it('should validate different documents separately', () => {
      const doc1 = createDocument('// @acp:category("test1")', 'file:///test1.ts')
      const doc2 = createDocument('// @acp:category("test2")', 'file:///test2.ts')

      provider.validate(doc1, 100)
      provider.validate(doc2, 100)

      vi.advanceTimersByTime(150)

      expect(connection.sendDiagnostics).toHaveBeenCalledTimes(2)
    })
  })

  describe('validateImmediate', () => {
    it('should validate immediately without debouncing', () => {
      const doc = createDocument('// @acp:category("test")')

      provider.validateImmediate(doc)

      expect(connection.sendDiagnostics).toHaveBeenCalledTimes(1)
    })

    it('should cancel pending debounced validation', () => {
      const doc = createDocument('// @acp:category("test")')

      provider.validate(doc, 100)
      provider.validateImmediate(doc)

      vi.advanceTimersByTime(150)

      expect(connection.sendDiagnostics).toHaveBeenCalledTimes(1)
    })
  })

  describe('clear', () => {
    it('should send empty diagnostics', () => {
      provider.clear('file:///test.ts')

      expect(connection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.ts',
        diagnostics: [],
      })
    })

    it('should cancel pending validation for the document', () => {
      const doc = createDocument('// @acp:unknown("test")')

      provider.validate(doc, 100)
      provider.clear(doc.uri)

      vi.advanceTimersByTime(150)

      // Should only be called once (by clear), not by validate
      expect(connection.sendDiagnostics).toHaveBeenCalledTimes(1)
      expect(connection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.ts',
        diagnostics: [],
      })
    })
  })

  describe('annotation validation', () => {
    describe('valid annotations', () => {
      it('should not report errors for valid category annotation', () => {
        const doc = createDocument('// @acp:category("service")')

        provider.validateImmediate(doc)

        expect(connection.sendDiagnostics).toHaveBeenCalledWith({
          uri: 'file:///test.ts',
          diagnostics: [],
        })
      })

      it('should not report errors for valid agent-instructions annotation', () => {
        const doc = createDocument('// @acp:agent-instructions("Do something")')

        provider.validateImmediate(doc)

        expect(connection.sendDiagnostics).toHaveBeenCalledWith({
          uri: 'file:///test.ts',
          diagnostics: [],
        })
      })

      it('should not report errors for valid deprecated annotation', () => {
        const doc = createDocument('// @acp:deprecated("Use newMethod instead")')

        provider.validateImmediate(doc)

        expect(connection.sendDiagnostics).toHaveBeenCalledWith({
          uri: 'file:///test.ts',
          diagnostics: [],
        })
      })
    })

    describe('unknown annotation type', () => {
      it('should report warning for unknown annotation type', () => {
        const doc = createDocument('// @acp:unknown-type("value")')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(1)
        expect(call.diagnostics[0].severity).toBe(DiagnosticSeverity.Warning)
        expect(call.diagnostics[0].code).toBe(ACPDiagnosticCode.UnknownAnnotationType)
        expect(call.diagnostics[0].message).toContain("Unknown ACP annotation type: 'unknown-type'")
      })
    })

    describe('missing parentheses', () => {
      it('should report error for annotation without parentheses', () => {
        const doc = createDocument('// @acp:category')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(1)
        expect(call.diagnostics[0].severity).toBe(DiagnosticSeverity.Error)
        expect(call.diagnostics[0].code).toBe(ACPDiagnosticCode.InvalidAnnotationSyntax)
        expect(call.diagnostics[0].message).toContain('requires a value in parentheses')
      })
    })

    describe('empty value', () => {
      it('should report error for empty parentheses', () => {
        const doc = createDocument('// @acp:category()')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(1)
        expect(call.diagnostics[0].severity).toBe(DiagnosticSeverity.Error)
        expect(call.diagnostics[0].code).toBe(ACPDiagnosticCode.MissingValue)
        expect(call.diagnostics[0].message).toContain('requires a non-empty value')
      })

      it('should report error for whitespace-only value', () => {
        const doc = createDocument('// @acp:category(   )')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(1)
        expect(call.diagnostics[0].code).toBe(ACPDiagnosticCode.MissingValue)
      })
    })

    describe('malformed annotations', () => {
      it('should report error for incomplete @acp: prefix', () => {
        const doc = createDocument('// @acp:123')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        const malformedErrors = call.diagnostics.filter(
          (d: { code: string }) => d.code === ACPDiagnosticCode.InvalidAnnotationSyntax
        )
        expect(malformedErrors.length).toBeGreaterThan(0)
      })
    })

    describe('value format validation', () => {
      it('should warn for unquoted category value', () => {
        const doc = createDocument('// @acp:category(service)')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(1)
        expect(call.diagnostics[0].code).toBe(ACPDiagnosticCode.InvalidValue)
        expect(call.diagnostics[0].message).toContain('quoted string')
      })

      it('should accept single-quoted category value', () => {
        const doc = createDocument("// @acp:category('service')")

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(0)
      })

      it('should error for non-numeric priority value', () => {
        const doc = createDocument('// @acp:priority("high")')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(1)
        expect(call.diagnostics[0].severity).toBe(DiagnosticSeverity.Error)
        expect(call.diagnostics[0].message).toContain('Priority value should be a number')
      })

      it('should accept numeric priority value', () => {
        const doc = createDocument('// @acp:priority(10)')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(0)
      })

      it('should accept quoted numeric priority value', () => {
        const doc = createDocument('// @acp:priority("5")')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(0)
      })

      it('should warn for invalid version format', () => {
        const doc = createDocument('// @acp:version("not-a-version")')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(1)
        expect(call.diagnostics[0].severity).toBe(DiagnosticSeverity.Warning)
        expect(call.diagnostics[0].message).toContain('semantic versioning')
      })

      it('should accept valid semver version', () => {
        const doc = createDocument('// @acp:version("1.0.0")')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(0)
      })

      it('should accept version with pre-release tag', () => {
        const doc = createDocument('// @acp:version("1.0.0-beta")')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(0)
      })

      it('should hint for unquoted values on other annotation types', () => {
        const doc = createDocument('// @acp:agent-instructions(some text)')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(1)
        expect(call.diagnostics[0].severity).toBe(DiagnosticSeverity.Hint)
        expect(call.diagnostics[0].message).toContain('Consider using a quoted string')
      })
    })

    describe('multiple annotations', () => {
      it('should find multiple annotations in a document', () => {
        const doc = createDocument(`
          // @acp:category("test")
          // @acp:unknown("value")
          // @acp:priority("not-a-number")
        `)

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics.length).toBeGreaterThanOrEqual(2)
      })

      it('should report correct positions for each error', () => {
        const doc = createDocument('// @acp:category() @acp:unknown("test")')

        provider.validateImmediate(doc)

        const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(call.diagnostics).toHaveLength(2)

        // First error for empty category
        expect(call.diagnostics[0].range.start.character).toBeLessThan(
          call.diagnostics[1].range.start.character
        )
      })
    })
  })

  describe('JSON file validation', () => {
    it('should delegate to schema validator for ACP config files', () => {
      const doc = createDocument('{"version": "1.0.0"}', 'file:///project/.acp.config.json')

      provider.validateImmediate(doc)

      expect(connection.sendDiagnostics).toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Schema validation'))
    })

    it('should validate invalid JSON syntax', () => {
      const doc = createDocument('{ invalid }', 'file:///project/.acp.config.json')

      provider.validateImmediate(doc)

      const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(call.diagnostics.length).toBeGreaterThan(0)
    })
  })

  describe('logging', () => {
    it('should log validation start', () => {
      const doc = createDocument('// test')

      provider.validateImmediate(doc)

      expect(logger.debug).toHaveBeenCalledWith('Validating document: file:///test.ts')
    })

    it('should log diagnostic count', () => {
      const doc = createDocument('// @acp:unknown("test")')

      provider.validateImmediate(doc)

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('1 diagnostic'))
    })
  })

  describe('diagnostic source', () => {
    it('should use "acp" as diagnostic source', () => {
      const doc = createDocument('// @acp:unknown("test")')

      provider.validateImmediate(doc)

      const call = (connection.sendDiagnostics as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(call.diagnostics[0].source).toBe('acp')
    })
  })
})

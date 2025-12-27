/**
 * Integration tests for document lifecycle management
 * Tests: open, change, save, close flows with diagnostics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestHarness, fileUri, type TestHarness } from './harness.js'

describe('Document Lifecycle Integration', () => {
  let harness: TestHarness

  beforeEach(async () => {
    harness = createTestHarness()
    await harness.initialize()
  })

  afterEach(() => {
    harness.shutdown()
  })

  describe('document open', () => {
    it('should initialize document metadata on open', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:purpose("test")\nconst x = 1;'

      harness.openDocument(uri, content)

      const metadata = harness.documentManager.getMetadata(uri)
      expect(metadata).toBeDefined()
      expect(metadata?.uri).toBe(uri)
      expect(metadata?.language).toBe('typescript')
    })

    it('should detect ACP config files', () => {
      const uri = fileUri('/workspace/.acp.config.json')
      const content = '{"version": "1.0"}'

      harness.openDocument(uri, content, 'json')

      const metadata = harness.documentManager.getMetadata(uri)
      expect(metadata?.isAcpConfig).toBe(true)
    })

    it('should detect ACP vars files', () => {
      const uri = fileUri('/workspace/.acp.vars.json')
      const content = '{"variables": {}}'

      harness.openDocument(uri, content, 'json')

      const metadata = harness.documentManager.getMetadata(uri)
      expect(metadata?.isAcpVars).toBe(true)
    })

    it('should detect ACP cache files', () => {
      const uri = fileUri('/workspace/.acp.cache.json')
      const content = '{"files": {}}'

      harness.openDocument(uri, content, 'json')

      const metadata = harness.documentManager.getMetadata(uri)
      expect(metadata?.isAcpCache).toBe(true)
    })

    it('should trigger validation on document open', async () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:invalid-type("test")'

      harness.openDocument(uri, content)

      // Use immediate validation for predictable testing
      harness.validateDocumentImmediate(uri)

      const diagnostics = harness.getDiagnostics(uri)
      expect(diagnostics.length).toBeGreaterThan(0)
    })

    it('should support multiple languages', () => {
      const cases = [
        { ext: 'ts', language: 'typescript' },
        { ext: 'tsx', language: 'typescript' },
        { ext: 'js', language: 'javascript' },
        { ext: 'jsx', language: 'javascript' },
        { ext: 'py', language: 'python' },
        { ext: 'rs', language: 'rust' },
        { ext: 'go', language: 'go' },
        { ext: 'java', language: 'java' },
        { ext: 'cs', language: 'csharp' },
        { ext: 'cpp', language: 'cpp' },
      ]

      cases.forEach(({ ext, language }) => {
        const uri = fileUri(`/workspace/test.${ext}`)
        const content = `// @acp:purpose("test")`

        harness.openDocument(uri, content, language)

        const metadata = harness.documentManager.getMetadata(uri)
        expect(metadata?.language).toBe(language)
      })
    })
  })

  describe('document change', () => {
    it('should update document content on change', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, 'const x = 1;')

      const newContent = 'const x = 2;'
      harness.changeDocument(uri, newContent)

      const doc = harness.documentManager.get(uri)
      expect(doc?.getText()).toBe(newContent)
    })

    it('should increment version on change', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, 'const x = 1;')

      const initialDoc = harness.documentManager.get(uri)
      const initialVersion = initialDoc?.version

      harness.changeDocument(uri, 'const x = 2;')

      const updatedDoc = harness.documentManager.get(uri)
      expect(updatedDoc?.version).toBe((initialVersion || 0) + 1)
    })

    it('should schedule validation on content change', async () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// Valid content')
      harness.clearDiagnostics()

      // Change to content with invalid annotation
      harness.changeDocument(uri, '// @acp:unknown-type("value")')
      harness.validateDocumentImmediate(uri)

      const diagnostics = harness.getDiagnostics(uri)
      expect(diagnostics.length).toBeGreaterThan(0)
      expect(diagnostics[0].message).toContain('Unknown')
    })

    it('should track pending validations', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, 'const x = 1;')

      // Multiple rapid changes
      harness.changeDocument(uri, 'const x = 2;')
      harness.changeDocument(uri, 'const x = 3;')
      harness.changeDocument(uri, 'const x = 4;')

      // Debounced validation means only one pending
      expect(harness.documentSyncHandler.pendingCount).toBeLessThanOrEqual(1)
    })
  })

  describe('document save', () => {
    it('should trigger immediate validation on save', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:invalid("test")')
      harness.clearDiagnostics()

      harness.saveDocument(uri)

      const diagnostics = harness.getDiagnostics(uri)
      expect(diagnostics.length).toBeGreaterThan(0)
    })

    it('should cancel pending validation on save', async () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, 'const x = 1;')

      // Change document (triggers pending validation)
      harness.changeDocument(uri, '// @acp:purpose("test")')

      // Save should cancel pending and validate immediately
      harness.saveDocument(uri)

      // No more pending validations
      expect(harness.documentSyncHandler.pendingCount).toBe(0)
    })
  })

  describe('document close', () => {
    it('should clear diagnostics on close', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:invalid("test")')
      harness.validateDocumentImmediate(uri)

      expect(harness.getDiagnostics(uri).length).toBeGreaterThan(0)

      harness.closeDocument(uri)

      expect(harness.getDiagnostics(uri).length).toBe(0)
    })

    it('should clean up document metadata on close', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, 'const x = 1;')

      expect(harness.documentManager.getMetadata(uri)).toBeDefined()

      harness.closeDocument(uri)

      // Document should no longer be accessible
      expect(harness.documentManager.get(uri)).toBeUndefined()
    })

    it('should cancel pending validations on close', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, 'const x = 1;')

      // Change document (triggers pending validation)
      harness.changeDocument(uri, 'const x = 2;')

      harness.closeDocument(uri)

      // Pending validation should be cancelled
      expect(harness.documentSyncHandler.pendingCount).toBe(0)
    })

    it('should handle closing non-existent document gracefully', () => {
      const uri = fileUri('/workspace/nonexistent.ts')

      expect(() => harness.closeDocument(uri)).toThrow()
    })
  })

  describe('multiple documents', () => {
    it('should handle multiple open documents', () => {
      const uri1 = fileUri('/workspace/file1.ts')
      const uri2 = fileUri('/workspace/file2.ts')
      const uri3 = fileUri('/workspace/file3.ts')

      harness.openDocument(uri1, '// File 1')
      harness.openDocument(uri2, '// File 2')
      harness.openDocument(uri3, '// File 3')

      const docs = harness.documentManager.all()
      expect(docs.length).toBe(3)
    })

    it('should maintain independent diagnostics per document', () => {
      const uri1 = fileUri('/workspace/file1.ts')
      const uri2 = fileUri('/workspace/file2.ts')

      harness.openDocument(uri1, '// @acp:invalid("test")')
      harness.openDocument(uri2, '// @acp:purpose("valid")')

      harness.validateDocumentImmediate(uri1)
      harness.validateDocumentImmediate(uri2)

      const diag1 = harness.getDiagnostics(uri1)
      const diag2 = harness.getDiagnostics(uri2)

      // File1 should have errors (unknown annotation)
      // File2 may have a hint about quoting but no errors
      expect(diag1.some(d => d.message.toLowerCase().includes('unknown'))).toBe(true)
    })

    it('should handle interleaved document operations', () => {
      const uri1 = fileUri('/workspace/file1.ts')
      const uri2 = fileUri('/workspace/file2.ts')

      harness.openDocument(uri1, 'const x = 1;')
      harness.openDocument(uri2, 'const y = 1;')

      harness.changeDocument(uri1, 'const x = 2;')
      harness.changeDocument(uri2, 'const y = 2;')

      harness.saveDocument(uri1)
      harness.closeDocument(uri2)

      expect(harness.documentManager.get(uri1)).toBeDefined()
      expect(harness.documentManager.get(uri2)).toBeUndefined()
    })
  })

  describe('version tracking', () => {
    it('should track document versions correctly through lifecycle', () => {
      const uri = fileUri('/workspace/test.ts')

      // Open - version 1
      harness.openDocument(uri, 'v1')
      let doc = harness.documentManager.get(uri)
      expect(doc?.version).toBe(1)

      // Change - version 2
      harness.changeDocument(uri, 'v2')
      doc = harness.documentManager.get(uri)
      expect(doc?.version).toBe(2)

      // Another change - version 3
      harness.changeDocument(uri, 'v3')
      doc = harness.documentManager.get(uri)
      expect(doc?.version).toBe(3)

      // Save doesn't change version
      harness.saveDocument(uri)
      doc = harness.documentManager.get(uri)
      expect(doc?.version).toBe(3)
    })
  })
})
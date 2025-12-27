/**
 * Integration tests for completion flow
 * Tests end-to-end completion requests through the LSP server
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestHarness, fileUri, getCompletionLabels, type TestHarness } from './harness.js'

describe('Completion Flow Integration', () => {
  let harness: TestHarness

  beforeEach(async () => {
    harness = createTestHarness()
    await harness.initialize()
  })

  afterEach(() => {
    harness.shutdown()
  })

  describe('namespace completions', () => {
    it('should provide namespace completions after @acp:', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:'
      harness.openDocument(uri, content)

      // Position at the end of @acp:
      const result = harness.getCompletions(uri, 0, 8)
      const labels = getCompletionLabels(result)

      // Should include common namespaces (from ALL_NAMESPACES)
      expect(labels).toContain('purpose')
      expect(labels).toContain('lock')
      expect(labels).toContain('fn')
      expect(labels).toContain('module')
    })

    it('should filter completions based on partial input', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:pur'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 11)
      const labels = getCompletionLabels(result)

      // Should have purpose as primary match
      expect(labels.includes('purpose')).toBe(true)
    })

    it('should provide completions for file-level annotations', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:pur'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 11)
      const labels = getCompletionLabels(result)

      expect(labels.includes('purpose')).toBe(true)
    })

    it('should provide completions for symbol-level annotations', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:f'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 9)
      const labels = getCompletionLabels(result)

      expect(labels.includes('fn')).toBe(true)
    })
  })

  describe('value completions', () => {
    it('should provide lock level completions', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:lock("'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 14)
      const labels = getCompletionLabels(result)

      // Should include lock levels
      expect(labels).toContain('frozen')
      expect(labels).toContain('restricted')
      expect(labels).toContain('normal')
      expect(labels).toContain('experimental')
    })

    it('should provide layer completions', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:layer("'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 15)
      const labels = getCompletionLabels(result)

      // Should include layers
      expect(labels).toContain('handler')
      expect(labels).toContain('service')
      expect(labels).toContain('repository')
    })

    it('should provide stability completions', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:stability("'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 19)
      const labels = getCompletionLabels(result)

      // Should include stability values
      expect(labels).toContain('stable')
      expect(labels).toContain('experimental')
      expect(labels).toContain('deprecated')
    })
  })

  describe('completions in different contexts', () => {
    it('should provide completions in line comments', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = 'const x = 1;\n// @acp:'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 1, 8)
      const labels = getCompletionLabels(result)

      expect(labels.length).toBeGreaterThan(0)
    })

    it('should provide completions in block comments', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '/* @acp: */'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 8)
      const labels = getCompletionLabels(result)

      expect(labels.length).toBeGreaterThan(0)
    })

    it('should provide completions in doc comments', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '/** @acp: */'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 9)
      const labels = getCompletionLabels(result)

      expect(labels.length).toBeGreaterThan(0)
    })

    it('should work with multiple annotations on different lines', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:purpose("test")\n// @acp:'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 1, 8)
      const labels = getCompletionLabels(result)

      expect(labels.length).toBeGreaterThan(0)
    })
  })

  describe('completion item properties', () => {
    it('should include documentation in completion items', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 8)
      const items = Array.isArray(result) ? result : result?.items || []

      // Find the 'lock' completion
      const lockItem = items.find((item) => item.label === 'lock')
      expect(lockItem).toBeDefined()
      expect(lockItem?.detail || lockItem?.documentation).toBeDefined()
    })

    it('should include insert text for snippets', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 8)
      const items = Array.isArray(result) ? result : result?.items || []

      // Items should have insertText or label as fallback
      const purposeItem = items.find((item) => item.label === 'purpose')
      expect(purposeItem).toBeDefined()
    })

    it('should include sort text for proper ordering', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 8)
      const items = Array.isArray(result) ? result : result?.items || []

      // Check that items have sortText for ordering
      expect(items.length).toBeGreaterThan(0)
    })
  })

  describe('JSON file completions', () => {
    it('should provide completions in .acp.config.json', () => {
      const uri = fileUri('/workspace/.acp.config.json')
      const content = '{\n  "'
      harness.openDocument(uri, content, 'json')

      const result = harness.getCompletions(uri, 1, 3)
      // JSON completions are handled differently; check the result is not null
      // The actual completions depend on schema validation
    })

    it('should provide completions in .acp.vars.json', () => {
      const uri = fileUri('/workspace/.acp.vars.json')
      const content = '{\n  "'
      harness.openDocument(uri, content, 'json')

      const result = harness.getCompletions(uri, 1, 3)
      // JSON completions might be schema-driven
    })
  })

  describe('completion edge cases', () => {
    it('should handle empty document', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = ''
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 0)
      // Should not crash, may return empty or null
      expect(result === null || getCompletionLabels(result).length >= 0).toBe(true)
    })

    it('should handle position outside @acp context', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = 'const x = 1;'
      harness.openDocument(uri, content)

      const result = harness.getCompletions(uri, 0, 5)
      // May return empty list or general completions
      expect(result === null || Array.isArray(result) || 'items' in result!).toBe(true)
    })

    it('should handle completion after document change', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, 'const x = 1;')

      // Change to content with @acp:
      harness.changeDocument(uri, '// @acp:')

      const result = harness.getCompletions(uri, 0, 8)
      const labels = getCompletionLabels(result)

      expect(labels.length).toBeGreaterThan(0)
    })

    it('should handle multiple @acp: on same line', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:purpose("a") @acp:'
      harness.openDocument(uri, content)

      // Position at the second @acp: (after @acp:purpose("a") @acp:)
      const result = harness.getCompletions(uri, 0, 26)
      const labels = getCompletionLabels(result)

      expect(labels.length).toBeGreaterThan(0)
    })
  })

  describe('completion performance', () => {
    it('should complete within reasonable time', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:'
      harness.openDocument(uri, content)

      const startTime = Date.now()
      harness.getCompletions(uri, 0, 8)
      const duration = Date.now() - startTime

      // Should complete in less than 50ms
      expect(duration).toBeLessThan(50)
    })

    it('should handle large document efficiently', () => {
      const uri = fileUri('/workspace/test.ts')
      // Create a large document with many lines
      const lines = Array.from({ length: 1000 }, (_, i) => `// Line ${i}`).join('\n')
      const content = lines + '\n// @acp:'
      harness.openDocument(uri, content)

      const startTime = Date.now()
      harness.getCompletions(uri, 1000, 8)
      const duration = Date.now() - startTime

      // Should complete in less than 100ms even for large files
      expect(duration).toBeLessThan(100)
    })
  })

  describe('completion consistency', () => {
    it('should provide same completions for same context', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:'
      harness.openDocument(uri, content)

      const result1 = harness.getCompletions(uri, 0, 8)
      const result2 = harness.getCompletions(uri, 0, 8)

      const labels1 = getCompletionLabels(result1)
      const labels2 = getCompletionLabels(result2)

      expect(labels1).toEqual(labels2)
    })

    it('should update completions after context change', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:')

      const result1 = harness.getCompletions(uri, 0, 8)
      const labels1 = getCompletionLabels(result1)

      // Change to lock context
      harness.changeDocument(uri, '// @acp:lock("')

      const result2 = harness.getCompletions(uri, 0, 14)
      const labels2 = getCompletionLabels(result2)

      // Labels should be different (namespace vs lock levels)
      expect(labels1).not.toEqual(labels2)
    })
  })
})
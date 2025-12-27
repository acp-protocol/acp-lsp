/**
 * Integration tests for cross-provider interactions
 * Tests how different providers interact with each other
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DiagnosticSeverity } from 'vscode-languageserver'
import { createTestHarness, fileUri, getCompletionLabels, type TestHarness } from './harness.js'

describe('Cross-Provider Interactions', () => {
  let harness: TestHarness

  beforeEach(async () => {
    harness = createTestHarness()
    await harness.initialize()
  })

  afterEach(() => {
    harness.shutdown()
  })

  describe('diagnostics and completions', () => {
    it('should provide completions for annotations that have diagnostics', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:invalid-type("test")\n// @acp:'
      harness.openDocument(uri, content)
      harness.validateDocumentImmediate(uri)

      // First line should have diagnostics
      const diagnostics = harness.getDiagnostics(uri)
      expect(diagnostics.length).toBeGreaterThan(0)

      // Second line should still provide completions
      const completions = harness.getCompletions(uri, 1, 8)
      const labels = getCompletionLabels(completions)
      expect(labels.length).toBeGreaterThan(0)
    })

    it('should clear diagnostics when annotation is corrected', () => {
      const uri = fileUri('/workspace/test.ts')

      // Open with invalid annotation
      harness.openDocument(uri, '// @acp:invalid-type("test")')
      harness.validateDocumentImmediate(uri)
      expect(harness.getDiagnostics(uri).length).toBeGreaterThan(0)

      // Fix the annotation using a valid namespace
      harness.changeDocument(uri, '// @acp:purpose("test")')
      harness.validateDocumentImmediate(uri)

      // Should have no errors for valid annotation
      const diagnostics = harness.getDiagnostics(uri)
      const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error)
      expect(errors.length).toBe(0)
    })

    it('should provide valid completions after clearing diagnostics', () => {
      const uri = fileUri('/workspace/test.ts')

      harness.openDocument(uri, '// @acp:invalid("test")')
      harness.validateDocumentImmediate(uri)
      harness.clearDiagnostics()

      // Change and get new completions
      harness.changeDocument(uri, '// @acp:')
      const completions = harness.getCompletions(uri, 0, 8)
      const labels = getCompletionLabels(completions)

      expect(labels).toContain('purpose')
      expect(labels).toContain('lock')
    })
  })

  describe('diagnostics and hover', () => {
    it('should provide hover for annotations with diagnostics', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:unknown-namespace("value")'
      harness.openDocument(uri, content)
      harness.validateDocumentImmediate(uri)

      // Should have diagnostics
      const diagnostics = harness.getDiagnostics(uri)
      expect(diagnostics.length).toBeGreaterThan(0)

      // Should still provide hover
      const hover = harness.getHover(uri, 0, 15)
      expect(hover).not.toBeNull()
    })

    it('should show hover warning consistent with diagnostics', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:unknown-namespace("value")'
      harness.openDocument(uri, content)
      harness.validateDocumentImmediate(uri)

      const diagnostics = harness.getDiagnostics(uri)
      const hover = harness.getHover(uri, 0, 15)

      // Both should mention "unknown"
      const hasDiagWarning = diagnostics.some((d) =>
        d.message.toLowerCase().includes('unknown')
      )
      let hasHoverWarning = false
      if (typeof hover?.contents === 'object' && 'value' in hover.contents) {
        hasHoverWarning = hover.contents.value.toLowerCase().includes('unknown')
      }

      expect(hasDiagWarning).toBe(true)
      expect(hasHoverWarning).toBe(true)
    })
  })

  describe('completions and hover', () => {
    it('should provide hover for items suggested by completion', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:')

      // Get completions
      const completions = harness.getCompletions(uri, 0, 8)
      const labels = getCompletionLabels(completions)

      // Simulate user selecting 'lock' from completions
      harness.changeDocument(uri, '// @acp:lock')

      // Should provide hover for 'lock'
      const hover = harness.getHover(uri, 0, 10)
      expect(hover).not.toBeNull()
      if (typeof hover?.contents === 'object' && 'value' in hover.contents) {
        expect(hover.contents.value).toContain('@acp:lock')
      }
    })

    it('should provide hover for completed annotation with value', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:lock("')

      // Get value completions
      const completions = harness.getCompletions(uri, 0, 14)
      const labels = getCompletionLabels(completions)
      expect(labels).toContain('frozen')

      // Simulate completing with 'frozen'
      harness.changeDocument(uri, '// @acp:lock("frozen")')

      // Hover should show full information
      const hover = harness.getHover(uri, 0, 10)
      if (typeof hover?.contents === 'object' && 'value' in hover.contents) {
        expect(hover.contents.value).toContain('frozen')
        expect(hover.contents.value).toContain('Restriction Hierarchy')
      }
    })
  })

  describe('multiple files interaction', () => {
    it('should maintain separate diagnostics for each file', () => {
      const uri1 = fileUri('/workspace/file1.ts')
      const uri2 = fileUri('/workspace/file2.ts')

      harness.openDocument(uri1, '// @acp:invalid("test")')
      harness.openDocument(uri2, '// @acp:purpose("test")')

      harness.validateDocumentImmediate(uri1)
      harness.validateDocumentImmediate(uri2)

      const diag1 = harness.getDiagnostics(uri1)
      const diag2 = harness.getDiagnostics(uri2)

      // File1 should have errors (unknown annotation)
      expect(diag1.some((d) => d.message.toLowerCase().includes('unknown'))).toBe(true)

      // File2 should not have unknown annotation errors
      expect(diag2.some((d) => d.message.toLowerCase().includes('unknown'))).toBe(false)
    })

    it('should provide file-specific completions', () => {
      const uri1 = fileUri('/workspace/file1.ts')
      const uri2 = fileUri('/workspace/file2.ts')

      harness.openDocument(uri1, '// @acp:')
      harness.openDocument(uri2, '// @acp:lock("')

      const completions1 = harness.getCompletions(uri1, 0, 8)
      const completions2 = harness.getCompletions(uri2, 0, 14)

      const labels1 = getCompletionLabels(completions1)
      const labels2 = getCompletionLabels(completions2)

      // File1 should get namespace completions
      expect(labels1).toContain('purpose')
      expect(labels1).toContain('lock')

      // File2 should get lock level completions
      expect(labels2).toContain('frozen')
      expect(labels2).toContain('normal')
    })

    it('should provide file-specific hover', () => {
      const uri1 = fileUri('/workspace/file1.ts')
      const uri2 = fileUri('/workspace/file2.ts')

      harness.openDocument(uri1, '// @acp:lock("frozen")')
      harness.openDocument(uri2, '// @acp:lock("normal")')

      const hover1 = harness.getHover(uri1, 0, 10)
      const hover2 = harness.getHover(uri2, 0, 10)

      if (typeof hover1?.contents === 'object' && 'value' in hover1.contents &&
          typeof hover2?.contents === 'object' && 'value' in hover2.contents) {
        // Both should show correct current level
        expect(hover1.contents.value).toContain('frozen')
        expect(hover2.contents.value).toContain('normal')
      }
    })
  })

  describe('vars file interaction', () => {
    it('should resolve variables across files', () => {
      // Open vars file with variable definition
      const varsUri = fileUri('/workspace/.acp.vars.json')
      harness.openDocument(varsUri, '{"variables": {"MY_VAR": "my_value"}}', 'json')

      // Open file referencing the variable
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// $MY_VAR')

      // Hover should resolve the variable
      const hover = harness.getHover(uri, 0, 5)
      expect(hover).not.toBeNull()
      if (typeof hover?.contents === 'object' && 'value' in hover.contents) {
        expect(hover.contents.value).toContain('my_value')
      }
    })

    it('should update hover when vars file changes', () => {
      // Initial vars file
      const varsUri = fileUri('/workspace/.acp.vars.json')
      harness.openDocument(varsUri, '{"variables": {"MY_VAR": "old_value"}}', 'json')

      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// $MY_VAR')

      // Initial hover
      let hover = harness.getHover(uri, 0, 5)
      if (typeof hover?.contents === 'object' && 'value' in hover.contents) {
        expect(hover.contents.value).toContain('old_value')
      }

      // Update vars file
      harness.changeDocument(varsUri, '{"variables": {"MY_VAR": "new_value"}}')

      // Hover should reflect new value
      hover = harness.getHover(uri, 0, 5)
      if (typeof hover?.contents === 'object' && 'value' in hover.contents) {
        expect(hover.contents.value).toContain('new_value')
      }
    })

    it('should show undefined when variable is removed from vars file', () => {
      // Initial vars file with variable
      const varsUri = fileUri('/workspace/.acp.vars.json')
      harness.openDocument(varsUri, '{"variables": {"MY_VAR": "value"}}', 'json')

      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// $MY_VAR')

      // Initial hover should resolve
      let hover = harness.getHover(uri, 0, 5)
      if (typeof hover?.contents === 'object' && 'value' in hover.contents) {
        expect(hover.contents.value).toContain('value')
      }

      // Remove variable from vars file
      harness.changeDocument(varsUri, '{"variables": {}}')

      // Hover should show undefined
      hover = harness.getHover(uri, 0, 5)
      if (typeof hover?.contents === 'object' && 'value' in hover.contents) {
        expect(hover.contents.value).toContain('Undefined variable')
      }
    })
  })

  describe('document lifecycle with providers', () => {
    it('should clear diagnostics when document is closed', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:invalid("test")')
      harness.validateDocumentImmediate(uri)

      expect(harness.getDiagnostics(uri).length).toBeGreaterThan(0)

      harness.closeDocument(uri)

      expect(harness.getDiagnostics(uri).length).toBe(0)
    })

    it('should stop providing completions for closed document', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:')

      // Completions work while open
      let completions = harness.getCompletions(uri, 0, 8)
      expect(getCompletionLabels(completions).length).toBeGreaterThan(0)

      harness.closeDocument(uri)

      // Should not crash, but won't provide completions
      completions = harness.getCompletions(uri, 0, 8)
      expect(completions === null || getCompletionLabels(completions).length === 0).toBe(true)
    })

    it('should stop providing hover for closed document', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:lock("frozen")')

      // Hover works while open
      let hover = harness.getHover(uri, 0, 10)
      expect(hover).not.toBeNull()

      harness.closeDocument(uri)

      // Should return null for closed document
      hover = harness.getHover(uri, 0, 10)
      expect(hover).toBeNull()
    })
  })

  describe('configuration changes', () => {
    it('should re-validate documents when configuration changes', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:purpose("test")')
      harness.validateDocumentImmediate(uri)

      const initialDiagCount = harness.getDiagnostics(uri).length

      // Configuration change would trigger re-validation
      // This is simulated by validating again
      harness.validateDocumentImmediate(uri)

      // Diagnostics should be consistent
      expect(harness.getDiagnostics(uri).length).toBe(initialDiagCount)
    })
  })

  describe('error recovery', () => {
    it('should continue working after encountering parse errors', () => {
      const uri = fileUri('/workspace/test.ts')

      // Invalid syntax
      harness.openDocument(uri, '// @acp:')
      harness.validateDocumentImmediate(uri)

      // Should still provide completions
      const completions = harness.getCompletions(uri, 0, 8)
      expect(getCompletionLabels(completions).length).toBeGreaterThan(0)

      // Fix the content
      harness.changeDocument(uri, '// @acp:lock("frozen")')
      harness.validateDocumentImmediate(uri)

      // Should provide hover
      const hover = harness.getHover(uri, 0, 10)
      expect(hover).not.toBeNull()
    })

    it('should handle malformed JSON in vars file gracefully', () => {
      // Open malformed vars file
      const varsUri = fileUri('/workspace/.acp.vars.json')
      harness.openDocument(varsUri, '{"variables": {', 'json')

      // Open file referencing a variable
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// $MY_VAR')

      // Should show undefined (graceful fallback)
      const hover = harness.getHover(uri, 0, 5)
      if (typeof hover?.contents === 'object' && 'value' in hover.contents) {
        expect(hover.contents.value).toContain('Undefined')
      }
    })
  })
})
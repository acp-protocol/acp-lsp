/**
 * Integration tests for hover flow
 * Tests end-to-end hover requests through the LSP server
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MarkupKind } from 'vscode-languageserver'
import { createTestHarness, fileUri, type TestHarness } from './harness.js'

describe('Hover Flow Integration', () => {
  let harness: TestHarness

  beforeEach(async () => {
    harness = createTestHarness()
    await harness.initialize()
  })

  afterEach(() => {
    harness.shutdown()
  })

  describe('annotation hover', () => {
    it('should provide hover for @acp:lock annotation', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:lock("frozen")'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 10)

      expect(result).not.toBeNull()
      expect(result?.contents).toBeDefined()

      if (typeof result?.contents === 'object' && 'kind' in result.contents) {
        expect(result.contents.kind).toBe(MarkupKind.Markdown)
        expect(result.contents.value).toContain('@acp:lock')
        expect(result.contents.value).toContain('frozen')
      }
    })

    it('should show lock level hierarchy visualization', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:lock("frozen")'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 10)

      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        // Should contain the ASCII hierarchy
        expect(result.contents.value).toContain('Restriction Hierarchy')
        expect(result.contents.value).toContain('CURRENT')
      }
    })

    it('should provide hover for @acp:purpose annotation', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:purpose("Authentication service")'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 10)

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('@acp:purpose')
        expect(result.contents.value).toContain('Authentication service')
      }
    })

    it('should provide hover for @acp:layer annotation', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:layer("service")'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 10)

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('service')
        expect(result.contents.value).toContain('business logic')
      }
    })

    it('should provide hover for @acp:stability annotation', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:stability("experimental")'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 15)

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('experimental')
      }
    })

    it('should include AI guidance when available', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:lock("frozen")'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 10)

      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('AI Guidance')
      }
    })

    it('should show warning for unknown namespace', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:unknown-namespace("value")'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 15)

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('Unknown namespace')
      }
    })
  })

  describe('variable hover', () => {
    it('should provide hover for built-in $FILE variable', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// $FILE'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 5)

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('$FILE')
        expect(result.contents.value).toContain('Built-in')
      }
    })

    it('should provide hover for built-in $FUNCTION variable', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// $FUNCTION'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 5)

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('$FUNCTION')
        expect(result.contents.value).toContain('enclosing function')
      }
    })

    it('should show warning for undefined variable', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// $UNDEFINED_VAR'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 5)

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('Undefined variable')
      }
    })

    it('should resolve variable from .acp.vars.json', () => {
      // Open vars file first
      const varsUri = fileUri('/workspace/.acp.vars.json')
      const varsContent = '{"variables": {"API_KEY": "secret123"}}'
      harness.openDocument(varsUri, varsContent, 'json')

      // Open test file with variable reference
      const uri = fileUri('/workspace/test.ts')
      const content = '// $API_KEY'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 5)

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('$API_KEY')
        expect(result.contents.value).toContain('secret123')
      }
    })
  })

  describe('hover range', () => {
    it('should return correct range for annotation', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:lock("frozen")'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 10)

      expect(result?.range).toBeDefined()
      expect(result?.range?.start.line).toBe(0)
      expect(result?.range?.end.line).toBe(0)
    })

    it('should return correct range for variable', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// $FILE'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 5)

      expect(result?.range).toBeDefined()
      if (result?.range) {
        expect(result.range.start.character).toBe(3) // Position of $
        expect(result.range.end.character).toBe(8) // End of FILE
      }
    })
  })

  describe('hover edge cases', () => {
    it('should return null for non-ACP content', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = 'const x = 1;'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 5)

      expect(result).toBeNull()
    })

    it('should return null when cursor is outside annotation', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// some text @acp:lock("frozen") more text'
      harness.openDocument(uri, content)

      // Position at "some"
      const result = harness.getHover(uri, 0, 4)

      expect(result).toBeNull()
    })

    it('should return null for empty document', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = ''
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 0, 0)

      expect(result).toBeNull()
    })

    it('should handle annotation on multiline', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = 'const x = 1;\n// @acp:lock("frozen")'
      harness.openDocument(uri, content)

      const result = harness.getHover(uri, 1, 10)

      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('@acp:lock')
      }
    })
  })

  describe('hover after document changes', () => {
    it('should update hover after document content changes', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, '// @acp:lock("frozen")')

      // Initial hover
      let result = harness.getHover(uri, 0, 10)
      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('frozen')
      }

      // Change to different lock level
      harness.changeDocument(uri, '// @acp:lock("normal")')

      // Hover should reflect new content
      result = harness.getHover(uri, 0, 10)
      expect(result).not.toBeNull()
      if (typeof result?.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain('normal')
      }
    })

    it('should work after changing from non-ACP to ACP content', () => {
      const uri = fileUri('/workspace/test.ts')
      harness.openDocument(uri, 'const x = 1;')

      // No hover for regular code
      let result = harness.getHover(uri, 0, 5)
      expect(result).toBeNull()

      // Change to ACP content
      harness.changeDocument(uri, '// @acp:lock("frozen")')

      // Should now have hover
      result = harness.getHover(uri, 0, 10)
      expect(result).not.toBeNull()
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
        const uri = fileUri('/workspace/test.ts')
        const content = `// @acp:lock("${level}")`
        harness.openDocument(uri, content)

        const result = harness.getHover(uri, 0, 10)

        expect(result).not.toBeNull()
        if (typeof result?.contents === 'object' && 'value' in result.contents) {
          expect(result.contents.value).toContain(level)
          expect(result.contents.value).toContain('CURRENT')
        }
      })
    })
  })

  describe('hover performance', () => {
    it('should return hover within reasonable time', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:lock("frozen")'
      harness.openDocument(uri, content)

      const startTime = Date.now()
      harness.getHover(uri, 0, 10)
      const duration = Date.now() - startTime

      // Should complete in less than 30ms
      expect(duration).toBeLessThan(30)
    })

    it('should handle large document efficiently', () => {
      const uri = fileUri('/workspace/test.ts')
      // Create a large document with many lines
      const lines = Array.from({ length: 1000 }, (_, i) => `// Line ${i}`).join('\n')
      const content = lines + '\n// @acp:lock("frozen")'
      harness.openDocument(uri, content)

      const startTime = Date.now()
      harness.getHover(uri, 1000, 10)
      const duration = Date.now() - startTime

      // Should complete in less than 50ms even for large files
      expect(duration).toBeLessThan(50)
    })
  })

  describe('hover consistency', () => {
    it('should provide same hover for same position', () => {
      const uri = fileUri('/workspace/test.ts')
      const content = '// @acp:lock("frozen")'
      harness.openDocument(uri, content)

      const result1 = harness.getHover(uri, 0, 10)
      const result2 = harness.getHover(uri, 0, 10)

      if (typeof result1?.contents === 'object' && 'value' in result1.contents &&
          typeof result2?.contents === 'object' && 'value' in result2.contents) {
        expect(result1.contents.value).toEqual(result2.contents.value)
      }
    })
  })
})
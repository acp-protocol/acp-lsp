import { describe, it, expect } from 'vitest'
import {
  getLanguageFromExtension,
  containsACPAnnotation,
  extractAnnotationType,
  parseQuotedValue,
} from '@acp-lsp/shared'

describe('getLanguageFromExtension', () => {
  it('should return typescript for .ts files', () => {
    expect(getLanguageFromExtension('foo.ts')).toBe('typescript')
  })

  it('should return typescript for .tsx files', () => {
    expect(getLanguageFromExtension('component.tsx')).toBe('typescript')
  })

  it('should return python for .py files', () => {
    expect(getLanguageFromExtension('script.py')).toBe('python')
  })

  it('should return null for unknown extensions', () => {
    expect(getLanguageFromExtension('file.unknown')).toBeNull()
  })
})

describe('containsACPAnnotation', () => {
  it('should return true for text with @acp: prefix', () => {
    expect(containsACPAnnotation('// @acp:category("test")')).toBe(true)
  })

  it('should return false for text without annotation', () => {
    expect(containsACPAnnotation('// just a comment')).toBe(false)
  })
})

describe('extractAnnotationType', () => {
  it('should extract category type', () => {
    expect(extractAnnotationType('@acp:category("test")')).toBe('category')
  })

  it('should extract agent-instructions type', () => {
    expect(extractAnnotationType('@acp:agent-instructions("do something")')).toBe(
      'agent-instructions'
    )
  })

  it('should return null for invalid annotation', () => {
    expect(extractAnnotationType('not an annotation')).toBeNull()
  })
})

describe('parseQuotedValue', () => {
  it('should remove surrounding quotes', () => {
    expect(parseQuotedValue('"hello"')).toBe('hello')
  })

  it('should handle escaped quotes', () => {
    expect(parseQuotedValue('"say \\"hello\\""')).toBe('say "hello"')
  })

  it('should return value as-is if not quoted', () => {
    expect(parseQuotedValue('unquoted')).toBe('unquoted')
  })
})
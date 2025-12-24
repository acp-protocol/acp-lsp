import { describe, it, expect } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  TypeScriptAnnotationParser,
  createParser,
  getCategoryForNamespace,
  isValidLockLevel,
  ALL_NAMESPACES,
  FILE_LEVEL_NAMESPACES,
  SYMBOL_LEVEL_NAMESPACES,
  CONSTRAINT_NAMESPACES,
  INLINE_NAMESPACES,
  AnnotationDiagnosticCode,
} from '../../src/parsers/index.js'

/**
 * Helper to create a TextDocument from content
 */
function createDocument(content: string, uri: string = 'file:///test.ts'): TextDocument {
  return TextDocument.create(uri, 'typescript', 1, content)
}

describe('TypeScriptAnnotationParser', () => {
  describe('Line comments', () => {
    it('should parse single-line comment with annotation', () => {
      const doc = createDocument('// @acp:fn("doSomething")')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].namespace).toBe('fn')
      expect(result.annotations[0].value).toBe('doSomething')
      expect(result.annotations[0].category).toBe('symbol-level')
    })

    it('should parse annotation without value', () => {
      const doc = createDocument('// @acp:deprecated')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].namespace).toBe('deprecated')
      expect(result.annotations[0].value).toBeUndefined()
    })

    it('should parse annotation with description', () => {
      const doc = createDocument('// @acp:fn("process") - Processes the input data')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].value).toBe('process')
      expect(result.annotations[0].description).toBe('Processes the input data')
    })

    it('should parse annotation with metadata', () => {
      const doc = createDocument('// @acp:fn("test") | async | throws')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].metadata).toEqual(['async', 'throws'])
    })

    it('should parse annotation with description and metadata', () => {
      const doc = createDocument('// @acp:fn("calc") - Calculates result | pure | memoized')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].value).toBe('calc')
      expect(result.annotations[0].description).toBe('Calculates result')
      expect(result.annotations[0].metadata).toEqual(['pure', 'memoized'])
    })
  })

  describe('Block comments', () => {
    it('should parse block comment with annotation', () => {
      const doc = createDocument('/* @acp:module("utils") */')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].namespace).toBe('module')
      expect(result.annotations[0].value).toBe('utils')
    })

    it('should parse multi-line block comment', () => {
      const doc = createDocument(`/*
 * @acp:purpose("Utility functions")
 */`)
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].namespace).toBe('purpose')
    })
  })

  describe('Doc comments', () => {
    it('should parse doc comment with annotation', () => {
      const doc = createDocument(`/**
 * @acp:fn("processData")
 */`)
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].namespace).toBe('fn')
      expect(result.annotations[0].value).toBe('processData')
    })

    it('should parse multiple annotations in doc comment', () => {
      const doc = createDocument(`/**
 * @acp:fn("handler")
 * @acp:deprecated
 * @acp:throws("Error")
 */`)
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(3)
      expect(result.annotations[0].namespace).toBe('fn')
      expect(result.annotations[1].namespace).toBe('deprecated')
      expect(result.annotations[2].namespace).toBe('throws')
    })

    it('should handle doc comment with other JSDoc tags', () => {
      const doc = createDocument(`/**
 * Process data function
 * @param data - The input data
 * @acp:fn("process")
 * @returns The processed result
 */`)
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].namespace).toBe('fn')
    })
  })

  describe('Variable references', () => {
    it('should extract simple variable reference', () => {
      const doc = createDocument('// @acp:fn($handler)')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].variableRefs).toHaveLength(1)
      expect(result.annotations[0].variableRefs[0].identifier).toBe('handler')
      expect(result.annotations[0].variableRefs[0].modifier).toBeUndefined()
    })

    it('should extract variable reference with modifier', () => {
      const doc = createDocument('// @acp:fn($config.timeout)')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].variableRefs).toHaveLength(1)
      expect(result.annotations[0].variableRefs[0].identifier).toBe('config')
      expect(result.annotations[0].variableRefs[0].modifier).toBe('timeout')
    })

    it('should extract multiple variable references', () => {
      const doc = createDocument('// @acp:fn($input, $output)')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].variableRefs).toHaveLength(2)
      expect(result.annotations[0].variableRefs[0].identifier).toBe('input')
      expect(result.annotations[0].variableRefs[1].identifier).toBe('output')
    })
  })

  describe('Validation and diagnostics', () => {
    it('should warn on unknown namespace', () => {
      const doc = createDocument('// @acp:unknown("value")')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.diagnostics).toHaveLength(1)
      expect(result.diagnostics[0].code).toBe(AnnotationDiagnosticCode.UnknownNamespace)
    })

    it('should error on invalid lock level', () => {
      const doc = createDocument('// @acp:lock("invalid-level")')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      const lockDiag = result.diagnostics.find(
        (d) => d.code === AnnotationDiagnosticCode.InvalidLockLevel
      )
      expect(lockDiag).toBeDefined()
    })

    it('should accept valid lock levels', () => {
      const doc = createDocument('// @acp:lock("frozen")')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      const lockDiag = result.diagnostics.find(
        (d) => d.code === AnnotationDiagnosticCode.InvalidLockLevel
      )
      expect(lockDiag).toBeUndefined()
    })

    it('should error on missing required value', () => {
      const doc = createDocument('// @acp:fn')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      const missingDiag = result.diagnostics.find(
        (d) => d.code === AnnotationDiagnosticCode.MissingValue
      )
      expect(missingDiag).toBeDefined()
    })

    it('should not error on optional value namespaces', () => {
      const doc = createDocument('// @acp:deprecated')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      const missingDiag = result.diagnostics.find(
        (d) => d.code === AnnotationDiagnosticCode.MissingValue
      )
      expect(missingDiag).toBeUndefined()
    })
  })

  describe('Edge cases', () => {
    it('should handle empty document', () => {
      const doc = createDocument('')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(0)
      expect(result.comments).toHaveLength(0)
    })

    it('should handle document with no annotations', () => {
      const doc = createDocument(`
// Regular comment
/* Block comment */
function test() {}
`)
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(0)
      expect(result.comments.length).toBeGreaterThan(0)
    })

    it('should handle escaped quotes in values', () => {
      const doc = createDocument('// @acp:fn("say \\"hello\\"")')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].value).toBe('say "hello"')
    })

    it('should handle single quotes', () => {
      const doc = createDocument("// @acp:fn('singleQuoted')")
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].value).toBe('singleQuoted')
    })

    it('should handle unquoted identifiers', () => {
      const doc = createDocument('// @acp:fn(myFunction)')
      const parser = new TypeScriptAnnotationParser(doc)
      const result = parser.parse()

      expect(result.annotations).toHaveLength(1)
      expect(result.annotations[0].value).toBe('myFunction')
    })
  })
})

describe('Namespace categories', () => {
  it('should categorize file-level namespaces correctly', () => {
    for (const ns of FILE_LEVEL_NAMESPACES) {
      expect(getCategoryForNamespace(ns)).toBe('file-level')
    }
  })

  it('should categorize symbol-level namespaces correctly', () => {
    for (const ns of SYMBOL_LEVEL_NAMESPACES) {
      expect(getCategoryForNamespace(ns)).toBe('symbol-level')
    }
  })

  it('should categorize constraint namespaces correctly', () => {
    for (const ns of CONSTRAINT_NAMESPACES) {
      expect(getCategoryForNamespace(ns)).toBe('constraint')
    }
  })

  it('should categorize inline namespaces correctly', () => {
    for (const ns of INLINE_NAMESPACES) {
      expect(getCategoryForNamespace(ns)).toBe('inline')
    }
  })

  it('should return null for unknown namespace', () => {
    expect(getCategoryForNamespace('unknown')).toBeNull()
  })
})

describe('Lock levels', () => {
  it('should validate all lock levels', () => {
    const validLevels = [
      'frozen',
      'restricted',
      'approval-required',
      'tests-required',
      'docs-required',
      'review-required',
      'normal',
      'experimental',
    ]

    for (const level of validLevels) {
      expect(isValidLockLevel(level)).toBe(true)
    }
  })

  it('should reject invalid lock levels', () => {
    expect(isValidLockLevel('invalid')).toBe(false)
    expect(isValidLockLevel('FROZEN')).toBe(false)
    expect(isValidLockLevel('')).toBe(false)
  })
})

describe('createParser factory', () => {
  it('should create parser for TypeScript files', () => {
    const doc = createDocument('// test', 'file:///test.ts')
    const parser = createParser(doc)
    expect(parser).toBeInstanceOf(TypeScriptAnnotationParser)
  })

  it('should create parser for JavaScript files', () => {
    const doc = createDocument('// test', 'file:///test.js')
    const parser = createParser(doc)
    expect(parser).toBeInstanceOf(TypeScriptAnnotationParser)
  })

  it('should create parser for TSX files', () => {
    const doc = createDocument('// test', 'file:///component.tsx')
    const parser = createParser(doc)
    expect(parser).toBeInstanceOf(TypeScriptAnnotationParser)
  })

  it('should create parser for JSX files', () => {
    const doc = createDocument('// test', 'file:///component.jsx')
    const parser = createParser(doc)
    expect(parser).toBeInstanceOf(TypeScriptAnnotationParser)
  })

  it('should return null for unsupported languages', () => {
    const doc = createDocument('# test', 'file:///test.py')
    const parser = createParser(doc)
    expect(parser).toBeNull()
  })

  it('should return null for unknown extensions', () => {
    const doc = createDocument('test', 'file:///test.unknown')
    const parser = createParser(doc)
    expect(parser).toBeNull()
  })
})

describe('ALL_NAMESPACES', () => {
  it('should contain all namespace categories', () => {
    const allNamespaces = new Set(ALL_NAMESPACES)

    for (const ns of FILE_LEVEL_NAMESPACES) {
      expect(allNamespaces.has(ns)).toBe(true)
    }
    for (const ns of SYMBOL_LEVEL_NAMESPACES) {
      expect(allNamespaces.has(ns)).toBe(true)
    }
    for (const ns of CONSTRAINT_NAMESPACES) {
      expect(allNamespaces.has(ns)).toBe(true)
    }
    for (const ns of INLINE_NAMESPACES) {
      expect(allNamespaces.has(ns)).toBe(true)
    }
  })

  it('should have expected total count', () => {
    const expectedCount =
      FILE_LEVEL_NAMESPACES.length +
      SYMBOL_LEVEL_NAMESPACES.length +
      CONSTRAINT_NAMESPACES.length +
      INLINE_NAMESPACES.length

    expect(ALL_NAMESPACES.length).toBe(expectedCount)
  })
})
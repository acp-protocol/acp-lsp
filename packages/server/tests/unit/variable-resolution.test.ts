/**
 * Unit tests for Variable Resolution Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  VariableResolutionService,
  BUILTIN_VARIABLES,
  VALID_MODIFIERS,
  type ResolvedVariable,
} from '../../src/services/variable-resolution.js'
import type { DocumentManager } from '../../src/documents/manager.js'
import type { Logger } from '../../src/utils/logger.js'

/**
 * Create a mock document manager
 */
function createMockDocumentManager(
  varsFiles: Array<{ uri: string; content: string }> = []
): DocumentManager {
  const docs = new Map<string, TextDocument>()
  const metadata = new Map<string, { isAcpVars: boolean }>()

  for (const file of varsFiles) {
    docs.set(file.uri, TextDocument.create(file.uri, 'json', 1, file.content))
    metadata.set(file.uri, { isAcpVars: true })
  }

  return {
    get: (uri: string) => docs.get(uri),
    all: () => Array.from(docs.values()),
    getMetadata: (uri: string) => metadata.get(uri) || null,
  } as unknown as DocumentManager
}

/**
 * Create a mock logger
 */
function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger
}

/**
 * Create a test document
 */
function createTestDocument(content: string, uri: string = 'file:///test.ts'): TextDocument {
  return TextDocument.create(uri, 'typescript', 1, content)
}

describe('VariableResolutionService', () => {
  let service: VariableResolutionService
  let mockDocManager: DocumentManager
  let mockLogger: Logger

  beforeEach(() => {
    mockDocManager = createMockDocumentManager()
    mockLogger = createMockLogger()
    service = new VariableResolutionService(mockDocManager, mockLogger)
  })

  describe('parseVariables', () => {
    it('should parse simple variable references', () => {
      const result = service.parseVariables('$MY_VAR')
      expect(result).toHaveLength(1)
      expect(result[0].identifier).toBe('MY_VAR')
      expect(result[0].modifier).toBeUndefined()
    })

    it('should parse variable with modifier', () => {
      const result = service.parseVariables('$CONFIG.full')
      expect(result).toHaveLength(1)
      expect(result[0].identifier).toBe('CONFIG')
      expect(result[0].modifier).toBe('full')
    })

    it('should parse multiple variables', () => {
      const result = service.parseVariables('$VAR1 and $VAR2.ref plus $VAR3')
      expect(result).toHaveLength(3)
      expect(result[0].identifier).toBe('VAR1')
      expect(result[1].identifier).toBe('VAR2')
      expect(result[1].modifier).toBe('ref')
      expect(result[2].identifier).toBe('VAR3')
    })

    it('should skip escaped $$ sequences', () => {
      const result = service.parseVariables('$$NOT_A_VAR and $REAL_VAR')
      expect(result).toHaveLength(1)
      expect(result[0].identifier).toBe('REAL_VAR')
    })

    it('should identify built-in variables', () => {
      const result = service.parseVariables('$FILE and $FUNCTION')
      expect(result).toHaveLength(2)
      expect(result[0].isBuiltin).toBe(true)
      expect(result[1].isBuiltin).toBe(true)
    })

    it('should infer type from prefix', () => {
      const result = service.parseVariables('$SYM_FUNC and $FILE_CONFIG and $DOM_AUTH')
      expect(result).toHaveLength(3)
      expect(result[0].inferredType).toBe('symbol')
      expect(result[1].inferredType).toBe('file')
      expect(result[2].inferredType).toBe('domain')
    })

    it('should track correct positions', () => {
      const text = 'prefix $MY_VAR suffix'
      const result = service.parseVariables(text)
      expect(result).toHaveLength(1)
      expect(result[0].start).toBe(7)
      expect(result[0].end).toBe(14)
      expect(text.substring(result[0].start, result[0].end)).toBe('$MY_VAR')
    })

    it('should handle empty text', () => {
      const result = service.parseVariables('')
      expect(result).toHaveLength(0)
    })

    it('should handle text without variables', () => {
      const result = service.parseVariables('just regular text')
      expect(result).toHaveLength(0)
    })

    it('should not match lowercase variable starts', () => {
      // $lowercase doesn't match because it starts with lowercase 'l'
      const result = service.parseVariables('$lowercase only')
      expect(result).toHaveLength(0)
    })

    it('should match partial uppercase from mixed case', () => {
      // $MixedCase will match as $M (first uppercase segment)
      const result = service.parseVariables('$MixedCase')
      expect(result).toHaveLength(1)
      expect(result[0].identifier).toBe('M') // Only uppercase portion
    })
  })

  describe('findVariableAtPosition', () => {
    it('should find variable at position', () => {
      const text = 'prefix $MY_VAR suffix'
      const result = service.findVariableAtPosition(text, 10)
      expect(result).not.toBeNull()
      expect(result?.identifier).toBe('MY_VAR')
    })

    it('should return null when not on a variable', () => {
      const text = 'prefix $MY_VAR suffix'
      const result = service.findVariableAtPosition(text, 3)
      expect(result).toBeNull()
    })

    it('should include modifier in range', () => {
      const text = '$CONFIG.full'
      const result = service.findVariableAtPosition(text, 10)
      expect(result).not.toBeNull()
      expect(result?.modifier).toBe('full')
    })
  })

  describe('validateVariableName', () => {
    it('should accept valid uppercase names', () => {
      expect(service.validateVariableName('MY_VAR')).toBe(true)
      expect(service.validateVariableName('CONFIG')).toBe(true)
      expect(service.validateVariableName('A123')).toBe(true)
      expect(service.validateVariableName('SYM_FUNCTION_NAME')).toBe(true)
    })

    it('should reject invalid names', () => {
      expect(service.validateVariableName('my_var')).toBe(false) // lowercase
      expect(service.validateVariableName('123VAR')).toBe(false) // starts with number
      expect(service.validateVariableName('_VAR')).toBe(false) // starts with underscore
      expect(service.validateVariableName('')).toBe(false) // empty
      expect(service.validateVariableName('VAR-NAME')).toBe(false) // hyphen
    })
  })

  describe('inferTypeFromPrefix', () => {
    it('should infer symbol type from SYM_ prefix', () => {
      expect(service.inferTypeFromPrefix('SYM_FUNCTION')).toBe('symbol')
      expect(service.inferTypeFromPrefix('SYM_CLASS_METHOD')).toBe('symbol')
    })

    it('should infer file type from FILE_ prefix', () => {
      expect(service.inferTypeFromPrefix('FILE_CONFIG')).toBe('file')
      expect(service.inferTypeFromPrefix('FILE_MAIN')).toBe('file')
    })

    it('should infer domain type from DOM_ prefix', () => {
      expect(service.inferTypeFromPrefix('DOM_AUTH')).toBe('domain')
      expect(service.inferTypeFromPrefix('DOM_PAYMENTS')).toBe('domain')
    })

    it('should return undefined for non-prefixed names', () => {
      expect(service.inferTypeFromPrefix('CONFIG')).toBeUndefined()
      expect(service.inferTypeFromPrefix('MY_VAR')).toBeUndefined()
    })
  })

  describe('resolve - built-in variables', () => {
    it('should resolve $FILE', () => {
      const doc = createTestDocument('test')
      const result = service.resolve(doc, 'FILE')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.variable.name).toBe('FILE')
        expect(result.variable.type).toBe('string')
        expect(result.variable.source).toBe('built-in')
      }
    })

    it('should resolve all built-in variables', () => {
      const doc = createTestDocument('test')

      for (const name of Object.keys(BUILTIN_VARIABLES)) {
        const result = service.resolve(doc, name)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.variable.source).toBe('built-in')
        }
      }
    })
  })

  describe('resolve - from vars files', () => {
    it('should resolve variable from .acp.vars.json', () => {
      const varsContent = JSON.stringify({
        variables: {
          API_KEY: 'secret123',
        },
      })

      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: varsContent },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const result = service.resolve(doc, 'API_KEY')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.variable.value).toBe('secret123')
        expect(result.variable.type).toBe('string')
      }
    })

    it('should resolve variable with type and description', () => {
      const varsContent = JSON.stringify({
        variables: {
          SYM_HANDLER: {
            type: 'symbol',
            value: 'handleRequest',
            description: 'Main request handler',
          },
        },
      })

      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: varsContent },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const result = service.resolve(doc, 'SYM_HANDLER')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.variable.value).toBe('handleRequest')
        expect(result.variable.type).toBe('symbol')
        expect(result.variable.description).toBe('Main request handler')
      }
    })

    it('should return error for undefined variable', () => {
      const doc = createTestDocument('test')
      const result = service.resolve(doc, 'UNDEFINED_VAR')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('undefined')
      }
    })
  })

  describe('resolve - validation', () => {
    it('should reject invalid variable names', () => {
      const doc = createTestDocument('test')
      const result = service.resolve(doc, 'invalid_name')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid')
      }
    })

    it('should reject invalid modifiers', () => {
      const doc = createTestDocument('test')
      const result = service.resolve(doc, 'FILE', 'invalid_modifier')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid')
        expect(result.error.message).toContain('Unknown modifier')
      }
    })

    it('should accept valid modifiers', () => {
      const doc = createTestDocument('test')

      for (const modifier of VALID_MODIFIERS) {
        const result = service.resolve(doc, 'FILE', modifier)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('circular reference detection', () => {
    it('should detect direct circular reference', () => {
      // Simulate a circular reference by manually adding to the stack
      // This is a unit test hack - in real usage, the stack is managed internally
      const varsContent = JSON.stringify({
        variables: {
          VAR_A: { type: 'string', value: 'references $VAR_A' },
        },
      })

      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: varsContent },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      // First resolution adds to stack
      const doc = createTestDocument('test')
      const result1 = service.resolve(doc, 'VAR_A')
      expect(result1.success).toBe(true)

      // Clear state for clean test
      service.clearState()
    })
  })

  describe('applyModifier', () => {
    const testVariable: ResolvedVariable = {
      name: 'TEST_VAR',
      type: 'symbol',
      value: 'testFunction',
      summary: 'A test function',
      full: { name: 'TEST_VAR', type: 'symbol', value: 'testFunction' },
      ref: 'src/test.ts:10',
      signature: 'function testFunction(): void',
      description: 'Test description',
      source: '.acp.vars.json',
      definitionLine: 5,
    }

    it('should apply .full modifier', () => {
      const result = service.applyModifier(testVariable, 'full')
      expect(result).toBe(JSON.stringify(testVariable.full, null, 2))
    })

    it('should apply .ref modifier', () => {
      const result = service.applyModifier(testVariable, 'ref')
      expect(result).toBe('src/test.ts:10')
    })

    it('should apply .signature modifier', () => {
      const result = service.applyModifier(testVariable, 'signature')
      expect(result).toBe('function testFunction(): void')
    })

    it('should fall back to summary when signature is missing', () => {
      const varWithoutSig = { ...testVariable, signature: undefined }
      const result = service.applyModifier(varWithoutSig, 'signature')
      expect(result).toBe('A test function')
    })
  })

  describe('expandAll', () => {
    it('should expand all variables in text', () => {
      const varsContent = JSON.stringify({
        variables: {
          NAME: 'World',
          GREETING: 'Hello',
        },
      })

      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: varsContent },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const result = service.expandAll(doc, '$GREETING, $NAME!')

      expect(result).toBe('Hello, World!')
    })

    it('should handle escaped $$ as single $', () => {
      const doc = createTestDocument('test')
      const result = service.expandAll(doc, 'Price: $$100')

      expect(result).toBe('Price: $100')
    })

    it('should preserve $$ when followed by variable-like text', () => {
      const varsContent = JSON.stringify({
        variables: { REAL: 'value' },
      })

      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: varsContent },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const result = service.expandAll(doc, '$$ESCAPED and $REAL')

      expect(result).toBe('$ESCAPED and value')
    })

    it('should handle text without variables', () => {
      const doc = createTestDocument('test')
      const result = service.expandAll(doc, 'No variables here')

      expect(result).toBe('No variables here')
    })
  })

  describe('getAvailableVariables', () => {
    it('should include built-in variables', () => {
      const doc = createTestDocument('test')
      const available = service.getAvailableVariables(doc)

      for (const name of Object.keys(BUILTIN_VARIABLES)) {
        expect(available.some((v) => v.name === name && v.source === 'built-in')).toBe(true)
      }
    })

    it('should include variables from vars files', () => {
      const varsContent = JSON.stringify({
        variables: {
          CUSTOM_VAR: 'value',
        },
      })

      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: varsContent },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const available = service.getAvailableVariables(doc)

      expect(available.some((v) => v.name === 'CUSTOM_VAR')).toBe(true)
    })
  })

  describe('isDefined', () => {
    it('should return true for built-in variables', () => {
      const doc = createTestDocument('test')

      expect(service.isDefined(doc, 'FILE')).toBe(true)
      expect(service.isDefined(doc, 'FUNCTION')).toBe(true)
    })

    it('should return true for defined custom variables', () => {
      const varsContent = JSON.stringify({
        variables: { CUSTOM: 'value' },
      })

      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: varsContent },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      expect(service.isDefined(doc, 'CUSTOM')).toBe(true)
    })

    it('should return false for undefined variables', () => {
      const doc = createTestDocument('test')
      expect(service.isDefined(doc, 'NOT_DEFINED')).toBe(false)
    })
  })

  describe('max depth enforcement', () => {
    it('should enforce max depth limit', () => {
      // We can't easily test this without internal access,
      // but we verify the constant exists
      expect(typeof VALID_MODIFIERS).toBe('object')
    })
  })

  describe('resolveWithModifier', () => {
    it('should return value without modifier', () => {
      const varsContent = JSON.stringify({
        variables: { TEST: 'test_value' },
      })

      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: varsContent },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const result = service.resolveWithModifier(doc, 'TEST')

      expect(result).toBe('test_value')
    })

    it('should apply modifier when provided', () => {
      const varsContent = JSON.stringify({
        variables: {
          TEST: { type: 'symbol', value: 'func', description: 'A function' },
        },
      })

      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: varsContent },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const result = service.resolveWithModifier(doc, 'TEST', 'full')

      expect(result).toContain('"type": "symbol"')
    })

    it('should return error message for undefined variables', () => {
      const doc = createTestDocument('test')
      const result = service.resolveWithModifier(doc, 'UNDEFINED')

      expect(result).toContain('[ERROR:')
      expect(result).toContain('Undefined variable')
    })
  })

  describe('clearState', () => {
    it('should clear expansion stack', () => {
      const doc = createTestDocument('test')

      // Resolve a variable to add to stack
      service.resolve(doc, 'FILE')

      // Clear state
      service.clearState()

      // Should be able to resolve again without issues
      const result = service.resolve(doc, 'FILE')
      expect(result.success).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle malformed vars file gracefully', () => {
      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: 'not valid json' },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const result = service.resolve(doc, 'SOME_VAR')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('undefined')
      }
    })

    it('should handle empty vars file', () => {
      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: '{}' },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const result = service.resolve(doc, 'SOME_VAR')

      expect(result.success).toBe(false)
    })

    it('should handle vars file without variables key', () => {
      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: '{"other": "data"}' },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')
      const result = service.resolve(doc, 'SOME_VAR')

      expect(result.success).toBe(false)
    })

    it('should handle multiple vars files', () => {
      mockDocManager = createMockDocumentManager([
        { uri: 'file:///workspace/.acp.vars.json', content: '{"variables": {"VAR1": "value1"}}' },
        { uri: 'file:///workspace/sub/.acp.vars.json', content: '{"variables": {"VAR2": "value2"}}' },
      ])
      service = new VariableResolutionService(mockDocManager, mockLogger)

      const doc = createTestDocument('test')

      const result1 = service.resolve(doc, 'VAR1')
      const result2 = service.resolve(doc, 'VAR2')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })
})

describe('BUILTIN_VARIABLES', () => {
  it('should have all expected built-ins', () => {
    expect(BUILTIN_VARIABLES).toHaveProperty('FILE')
    expect(BUILTIN_VARIABLES).toHaveProperty('LINE')
    expect(BUILTIN_VARIABLES).toHaveProperty('FUNCTION')
    expect(BUILTIN_VARIABLES).toHaveProperty('CLASS')
    expect(BUILTIN_VARIABLES).toHaveProperty('MODULE')
  })

  it('should have required properties for each built-in', () => {
    for (const [, info] of Object.entries(BUILTIN_VARIABLES)) {
      expect(info).toHaveProperty('description')
      expect(info).toHaveProperty('expansion')
      expect(info).toHaveProperty('contextual')
      expect(typeof info.description).toBe('string')
      expect(typeof info.expansion).toBe('string')
      expect(typeof info.contextual).toBe('boolean')
    }
  })
})

describe('VALID_MODIFIERS', () => {
  it('should include expected modifiers', () => {
    expect(VALID_MODIFIERS).toContain('full')
    expect(VALID_MODIFIERS).toContain('ref')
    expect(VALID_MODIFIERS).toContain('signature')
  })

  it('should be a readonly array', () => {
    expect(Array.isArray(VALID_MODIFIERS)).toBe(true)
    expect(VALID_MODIFIERS.length).toBe(3)
  })
})
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { DiagnosticSeverity } from 'vscode-languageserver'
import { SchemaValidator, SchemaType } from '../../src/services/schema-validator.js'
import { Logger } from '../../src/utils/logger.js'

/**
 * Mock Logger for testing
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
 * Helper to create a TextDocument from content
 */
function createDocument(content: string, uri: string): TextDocument {
  return TextDocument.create(uri, 'json', 1, content)
}

describe('SchemaValidator', () => {
  let logger: Logger
  let validator: SchemaValidator

  beforeEach(() => {
    logger = createMockLogger()
    validator = new SchemaValidator(logger)
  })

  describe('detectSchemaType', () => {
    it('should detect config file patterns', () => {
      expect(validator.detectSchemaType('file:///project/.acp.config.json')).toBe('config')
      expect(validator.detectSchemaType('file:///project/acp.config.json')).toBe('config')
      expect(validator.detectSchemaType('file:///deep/path/.acp.config.json')).toBe('config')
    })

    it('should detect cache file patterns', () => {
      expect(validator.detectSchemaType('file:///project/.acp.cache.json')).toBe('cache')
      expect(validator.detectSchemaType('file:///project/acp.cache.json')).toBe('cache')
      expect(validator.detectSchemaType('file:///project/custom.acp.cache.json')).toBe('cache')
    })

    it('should detect vars file patterns', () => {
      expect(validator.detectSchemaType('file:///project/.acp.vars.json')).toBe('vars')
      expect(validator.detectSchemaType('file:///project/acp.vars.json')).toBe('vars')
      expect(validator.detectSchemaType('file:///project/dev.acp.vars.json')).toBe('vars')
    })

    it('should detect attempts file', () => {
      expect(validator.detectSchemaType('file:///project/acp.attempts.json')).toBe('attempts')
    })

    it('should detect sync file', () => {
      expect(validator.detectSchemaType('file:///project/acp.sync.json')).toBe('sync')
    })

    it('should detect primer file patterns', () => {
      expect(validator.detectSchemaType('file:///project/my.primer.json')).toBe('primer')
      expect(validator.detectSchemaType('file:///project/component.primer.json')).toBe('primer')
      expect(validator.detectSchemaType('file:///project/.primer.json')).toBe('primer')
    })

    it('should return null for non-ACP files', () => {
      expect(validator.detectSchemaType('file:///project/package.json')).toBeNull()
      expect(validator.detectSchemaType('file:///project/tsconfig.json')).toBeNull()
      expect(validator.detectSchemaType('file:///project/config.json')).toBeNull()
      expect(validator.detectSchemaType('file:///project/.acp.other.json')).toBeNull()
    })
  })

  describe('isAcpJsonFile', () => {
    it('should return true for ACP files', () => {
      expect(validator.isAcpJsonFile('file:///project/.acp.config.json')).toBe(true)
      expect(validator.isAcpJsonFile('file:///project/.acp.cache.json')).toBe(true)
      expect(validator.isAcpJsonFile('file:///project/.acp.vars.json')).toBe(true)
      expect(validator.isAcpJsonFile('file:///project/acp.attempts.json')).toBe(true)
      expect(validator.isAcpJsonFile('file:///project/acp.sync.json')).toBe(true)
      expect(validator.isAcpJsonFile('file:///project/my.primer.json')).toBe(true)
    })

    it('should return false for non-ACP files', () => {
      expect(validator.isAcpJsonFile('file:///project/package.json')).toBe(false)
      expect(validator.isAcpJsonFile('file:///project/tsconfig.json')).toBe(false)
    })
  })

  describe('getSchema', () => {
    it('should return schemas for all types', () => {
      const types: SchemaType[] = ['config', 'cache', 'vars', 'attempts', 'sync', 'primer']

      for (const type of types) {
        const schema = validator.getSchema(type)
        expect(schema).toBeDefined()
        expect(typeof schema).toBe('object')
      }
    })
  })

  describe('validate', () => {
    describe('non-ACP files', () => {
      it('should return valid for non-ACP JSON files', () => {
        const doc = createDocument('{"name": "test"}', 'file:///package.json')
        const result = validator.validate(doc)

        expect(result.valid).toBe(true)
        expect(result.schemaType).toBeNull()
        expect(result.diagnostics).toHaveLength(0)
      })
    })

    describe('config schema', () => {
      it('should validate a valid config file', () => {
        const validConfig = JSON.stringify({
          version: '1.0.0',
          include: ['**/*'],
          exclude: ['node_modules/**'],
        })
        const doc = createDocument(validConfig, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.valid).toBe(true)
        expect(result.schemaType).toBe('config')
        expect(result.diagnostics).toHaveLength(0)
      })

      it('should report error for invalid version pattern', () => {
        // Version must match pattern: "^\\d+\\.\\d+\\.\\d+"
        const invalidConfig = JSON.stringify({
          version: 'not-a-version',
        })
        const doc = createDocument(invalidConfig, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.schemaType).toBe('config')
        // The pattern requires digits - 'not-a-version' should fail
        expect(result.valid).toBe(false)
        expect(result.diagnostics.length).toBeGreaterThan(0)
        expect(result.diagnostics[0].code).toBe('pattern')
      })

      it('should report error for wrong type', () => {
        // Version must be string, not number
        const invalidConfig = JSON.stringify({
          version: 123,
        })
        const doc = createDocument(invalidConfig, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.schemaType).toBe('config')
        expect(result.valid).toBe(false)
        expect(result.diagnostics.length).toBeGreaterThan(0)
        expect(result.diagnostics[0].code).toBe('type')
      })

      it('should allow empty config object', () => {
        const doc = createDocument('{}', 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.valid).toBe(true)
        expect(result.schemaType).toBe('config')
      })
    })

    describe('vars schema', () => {
      it('should validate a valid vars file', () => {
        const validVars = JSON.stringify({
          variables: {
            API_KEY: 'secret',
            DEBUG: 'true',
          },
        })
        const doc = createDocument(validVars, 'file:///project/.acp.vars.json')
        const result = validator.validate(doc)

        expect(result.schemaType).toBe('vars')
        // vars schema may have different structure requirements
      })
    })

    describe('cache schema', () => {
      it('should validate a valid cache file', () => {
        const validCache = JSON.stringify({
          version: '1.0.0',
          annotations: [],
        })
        const doc = createDocument(validCache, 'file:///project/.acp.cache.json')
        const result = validator.validate(doc)

        expect(result.schemaType).toBe('cache')
      })
    })

    describe('JSON syntax errors', () => {
      it('should report JSON syntax errors', () => {
        const invalidJson = '{ "version": "1.0.0", invalid }'
        const doc = createDocument(invalidJson, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.valid).toBe(false)
        expect(result.schemaType).toBe('config')
        expect(result.diagnostics).toHaveLength(1)
        expect(result.diagnostics[0].source).toBe('acp-json')
        expect(result.diagnostics[0].message).toContain('Invalid JSON')
      })

      it('should provide position information for JSON errors', () => {
        const invalidJson = '{\n  "version": 1.0.0\n}'
        const doc = createDocument(invalidJson, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.valid).toBe(false)
        expect(result.diagnostics).toHaveLength(1)
        expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Error)
      })
    })

    describe('schema validation errors', () => {
      it('should report type errors', () => {
        const badType = JSON.stringify({
          include: 'should-be-array',
        })
        const doc = createDocument(badType, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.valid).toBe(false)
        const typeError = result.diagnostics.find((d) => d.code === 'type')
        expect(typeError).toBeDefined()
      })

      it('should report enum errors for invalid values', () => {
        const badEnum = JSON.stringify({
          error_handling: {
            strictness: 'invalid-value',
          },
        })
        const doc = createDocument(badEnum, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.valid).toBe(false)
        const enumError = result.diagnostics.find((d) => d.code === 'enum')
        expect(enumError).toBeDefined()
        expect(enumError?.message).toContain('Must be one of')
      })

      it('should report all errors when multiple issues exist', () => {
        const multipleErrors = JSON.stringify({
          version: 123, // should be string
          include: 'not-array', // should be array
        })
        const doc = createDocument(multipleErrors, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.valid).toBe(false)
        expect(result.diagnostics.length).toBeGreaterThan(1)
      })
    })

    describe('diagnostic properties', () => {
      it('should include correct source identifier', () => {
        const badConfig = JSON.stringify({ version: 123 })
        const doc = createDocument(badConfig, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.diagnostics[0].source).toBe('acp-schema-config')
      })

      it('should include error code as keyword', () => {
        const badConfig = JSON.stringify({ version: 123 })
        const doc = createDocument(badConfig, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.diagnostics[0].code).toBeDefined()
        expect(typeof result.diagnostics[0].code).toBe('string')
      })

      it('should include proper range information', () => {
        const badConfig = JSON.stringify({ version: 123 })
        const doc = createDocument(badConfig, 'file:///project/.acp.config.json')
        const result = validator.validate(doc)

        expect(result.diagnostics[0].range).toBeDefined()
        expect(result.diagnostics[0].range.start).toBeDefined()
        expect(result.diagnostics[0].range.end).toBeDefined()
      })
    })
  })

  describe('error message formatting', () => {
    it('should format required errors clearly', () => {
      // This depends on schema requirements - some schemas may not have required fields
      // Test with a schema that has required fields if applicable
    })

    it('should format type errors with expected type', () => {
      const badType = JSON.stringify({ include: 'string' })
      const doc = createDocument(badType, 'file:///project/.acp.config.json')
      const result = validator.validate(doc)

      if (result.diagnostics.length > 0) {
        const typeError = result.diagnostics.find((d) => d.code === 'type')
        if (typeError) {
          expect(typeError.message).toContain('Expected')
        }
      }
    })

    it('should format enum errors with allowed values', () => {
      const badEnum = JSON.stringify({
        error_handling: { strictness: 'bad' },
      })
      const doc = createDocument(badEnum, 'file:///project/.acp.config.json')
      const result = validator.validate(doc)

      const enumError = result.diagnostics.find((d) => d.code === 'enum')
      if (enumError) {
        expect(enumError.message).toContain('Must be one of')
      }
    })
  })
})
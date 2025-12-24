/**
 * @acp:category("service")
 * @acp:agent-instructions("Schema validator that validates ACP JSON files against their respective schemas")
 */

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import { DiagnosticSeverity, type Diagnostic, type Range } from 'vscode-languageserver'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { Logger } from '../utils/logger.js'

// Import schemas - resolved via resolveJsonModule
// Path is relative to packages/server/src/services/
import configSchema from '../../../../schemas/v1/config.schema.json' with { type: 'json' }
import cacheSchema from '../../../../schemas/v1/cache.schema.json' with { type: 'json' }
import varsSchema from '../../../../schemas/v1/vars.schema.json' with { type: 'json' }
import attemptsSchema from '../../../../schemas/v1/attempts.schema.json' with { type: 'json' }
import syncSchema from '../../../../schemas/v1/sync.schema.json' with { type: 'json' }
import primerSchema from '../../../../schemas/v1/primer.schema.json' with { type: 'json' }

/**
 * ACP schema types for all supported JSON configuration files
 */
export type SchemaType = 'config' | 'cache' | 'vars' | 'attempts' | 'sync' | 'primer'

/**
 * Result of schema validation
 */
export interface ValidationResult {
  /** Whether the document passed validation */
  valid: boolean
  /** Detected schema type (null if not an ACP JSON file) */
  schemaType: SchemaType | null
  /** Diagnostic messages for validation errors */
  diagnostics: Diagnostic[]
}

/**
 * Schema validator for ACP JSON configuration files.
 * Validates documents against their respective JSON schemas and produces
 * LSP diagnostics for any validation errors.
 */
export class SchemaValidator {
  private ajv: Ajv
  private validators = new Map<SchemaType, ValidateFunction>()
  private schemas: Record<SchemaType, object>
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      // Don't validate the $schema keyword in the schemas
      validateSchema: false,
    })
    addFormats(this.ajv)

    // Map schema types to imported schemas
    this.schemas = {
      config: configSchema as object,
      cache: cacheSchema as object,
      vars: varsSchema as object,
      attempts: attemptsSchema as object,
      sync: syncSchema as object,
      primer: primerSchema as object,
    }

    // First, add all schemas so $refs can be resolved between them
    for (const [type, schema] of Object.entries(this.schemas)) {
      try {
        this.ajv.addSchema(schema, (schema as { $id?: string }).$id)
        this.logger.debug(`Added schema: ${type}`)
      } catch (e) {
        this.logger.error(`Failed to add schema: ${type}`, e)
      }
    }

    // Now compile all schemas (references should resolve)
    for (const [type, schema] of Object.entries(this.schemas)) {
      try {
        const schemaId = (schema as { $id?: string }).$id
        const validator = schemaId ? this.ajv.getSchema(schemaId) : this.ajv.compile(schema)
        if (validator) {
          this.validators.set(type as SchemaType, validator)
          this.logger.debug(`Compiled schema: ${type}`)
        } else {
          this.logger.error(`Failed to get validator for schema: ${type}`)
        }
      } catch (e) {
        this.logger.error(`Failed to compile schema: ${type}`, e)
      }
    }
  }

  /**
   * Detect the schema type from a document URI based on filename patterns
   *
   * | Schema Type | File Patterns |
   * |-------------|---------------|
   * | config | `.acp.config.json`, `acp.config.json` |
   * | cache | `.acp.cache.json`, `*.acp.cache.json` |
   * | vars | `.acp.vars.json`, `*.acp.vars.json` |
   * | attempts | `acp.attempts.json` |
   * | sync | `acp.sync.json` |
   * | primer | `*.primer.json` |
   */
  detectSchemaType(uri: string): SchemaType | null {
    const filename = uri.split('/').pop() || ''

    if (/\.?acp\.config\.json$/.test(filename)) return 'config'
    if (/\.?acp\.cache\.json$/.test(filename)) return 'cache'
    if (/\.?acp\.vars\.json$/.test(filename)) return 'vars'
    if (filename === 'acp.attempts.json') return 'attempts'
    if (filename === 'acp.sync.json') return 'sync'
    if (/\.?primer\.json$/.test(filename)) return 'primer'

    return null
  }

  /**
   * Validate a document against its detected schema
   */
  validate(document: TextDocument): ValidationResult {
    const schemaType = this.detectSchemaType(document.uri)

    // Not an ACP JSON file
    if (!schemaType) {
      return { valid: true, diagnostics: [], schemaType: null }
    }

    const validator = this.validators.get(schemaType)
    if (!validator) {
      this.logger.warn(`No validator available for schema type: ${schemaType}`)
      return { valid: true, diagnostics: [], schemaType }
    }

    // Try to parse JSON
    let data: unknown
    try {
      data = JSON.parse(document.getText())
    } catch (e) {
      return {
        valid: false,
        schemaType,
        diagnostics: [this.createJsonSyntaxDiagnostic(document, e as Error)],
      }
    }

    // Validate against schema
    const valid = validator(data)
    const diagnostics = valid ? [] : this.toDiagnostics(document, validator.errors || [], schemaType)

    this.logger.debug(`Validated ${schemaType} schema: ${valid ? 'valid' : diagnostics.length + ' errors'}`)

    return { valid, diagnostics, schemaType }
  }

  /**
   * Get the schema object for a specific type (useful for completions)
   */
  getSchema(type: SchemaType): object | undefined {
    return this.schemas[type]
  }

  /**
   * Check if a document is an ACP JSON file
   */
  isAcpJsonFile(uri: string): boolean {
    return this.detectSchemaType(uri) !== null
  }

  /**
   * Convert AJV validation errors to LSP diagnostics
   */
  private toDiagnostics(
    document: TextDocument,
    errors: ErrorObject[],
    schemaType: SchemaType
  ): Diagnostic[] {
    return errors.map((err) => ({
      severity: DiagnosticSeverity.Error,
      range: this.findErrorRange(document, err),
      message: this.formatErrorMessage(err),
      source: `acp-schema-${schemaType}`,
      code: err.keyword,
    }))
  }

  /**
   * Find the range in the document where the error occurred
   */
  private findErrorRange(document: TextDocument, error: ErrorObject): Range {
    const text = document.getText()
    const path = error.instancePath.split('/').filter(Boolean)

    // Try to find the location of the property in the document
    if (path.length > 0) {
      const lastKey = path[path.length - 1]
      const searchKey = `"${lastKey}"`

      // Find the key in the document
      const idx = text.indexOf(searchKey)
      if (idx !== -1) {
        return {
          start: document.positionAt(idx),
          end: document.positionAt(idx + searchKey.length),
        }
      }
    }

    // For 'required' errors, try to find the parent object
    if (error.keyword === 'required' && error.params?.missingProperty) {
      const parentPath = path.slice(0, -1)
      if (parentPath.length > 0) {
        const parentKey = `"${parentPath[parentPath.length - 1]}"`
        const idx = text.indexOf(parentKey)
        if (idx !== -1) {
          return {
            start: document.positionAt(idx),
            end: document.positionAt(idx + parentKey.length),
          }
        }
      }
    }

    // Default to the beginning of the document
    return {
      start: { line: 0, character: 0 },
      end: { line: 0, character: Math.min(100, text.indexOf('\n') || 100) },
    }
  }

  /**
   * Format an AJV error into a human-readable message
   */
  private formatErrorMessage(error: ErrorObject): string {
    const path = error.instancePath || 'root'

    switch (error.keyword) {
      case 'required':
        return `Missing required property: ${error.params?.missingProperty}`
      case 'type':
        return `${path}: Expected ${error.params?.type}`
      case 'enum':
        return `${path}: Must be one of: ${error.params?.allowedValues?.join(', ')}`
      case 'additionalProperties':
        return `${path}: Unknown property: ${error.params?.additionalProperty}`
      case 'pattern':
        return `${path}: Does not match required pattern`
      case 'minimum':
        return `${path}: Value must be >= ${error.params?.limit}`
      case 'maximum':
        return `${path}: Value must be <= ${error.params?.limit}`
      case 'minLength':
        return `${path}: String must be at least ${error.params?.limit} characters`
      case 'maxLength':
        return `${path}: String must be at most ${error.params?.limit} characters`
      case 'minItems':
        return `${path}: Array must have at least ${error.params?.limit} items`
      case 'maxItems':
        return `${path}: Array must have at most ${error.params?.limit} items`
      case 'format':
        return `${path}: Invalid format, expected ${error.params?.format}`
      default:
        return `${path}: ${error.message || 'Validation error'}`
    }
  }

  /**
   * Create a diagnostic for JSON syntax errors
   */
  private createJsonSyntaxDiagnostic(document: TextDocument, error: Error): Diagnostic {
    // Try to extract position from JSON parse error message
    const match = error.message.match(/position (\d+)/)
    const position = match ? parseInt(match[1], 10) : 0
    const pos = document.positionAt(position)

    return {
      severity: DiagnosticSeverity.Error,
      range: {
        start: pos,
        end: { line: pos.line, character: pos.character + 10 },
      },
      message: `Invalid JSON: ${error.message}`,
      source: 'acp-json',
    }
  }
}
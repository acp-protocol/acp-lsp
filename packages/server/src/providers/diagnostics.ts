/**
 * @acp:category("provider")
 * @acp:agent-instructions("Diagnostics provider that validates ACP annotations and JSON schemas, reporting issues to the client")
 */

import type { Connection, Diagnostic } from 'vscode-languageserver'
import { DiagnosticSeverity } from 'vscode-languageserver'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { DocumentManager } from '../documents/manager.js'
import type { Logger } from '../utils/logger.js'
import { SchemaValidator } from '../services/schema-validator.js'
import { ACP_ANNOTATION_PREFIX, ACP_ANNOTATION_TYPES } from '@acp-lsp/shared'

/**
 * Source identifier for ACP diagnostics
 */
const DIAGNOSTIC_SOURCE = 'acp'

/**
 * Diagnostic codes for different issues
 */
export enum ACPDiagnosticCode {
  UnknownAnnotationType = 'acp-unknown-type',
  InvalidAnnotationSyntax = 'acp-invalid-syntax',
  MissingValue = 'acp-missing-value',
  InvalidValue = 'acp-invalid-value',
  DuplicateAnnotation = 'acp-duplicate',
}

/**
 * Diagnostics provider for ACP annotations and JSON schemas
 * Validates annotation syntax, semantics, and JSON schema compliance
 */
export class DiagnosticsProvider {
  private connection: Connection
  private _documentManager: DocumentManager
  private logger: Logger
  private schemaValidator: SchemaValidator
  private validationTimeout: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor(connection: Connection, documentManager: DocumentManager, logger: Logger) {
    this.connection = connection
    this._documentManager = documentManager
    this.logger = logger
    this.schemaValidator = new SchemaValidator(logger)
  }

  /**
   * Get the document manager
   */
  get documentManager(): DocumentManager {
    return this._documentManager
  }

  /**
   * Validate a document and send diagnostics
   * Uses debouncing to avoid excessive validation on rapid typing
   */
  validate(document: TextDocument, debounceMs: number = 250): void {
    const uri = document.uri

    // Clear any pending validation
    const existingTimeout = this.validationTimeout.get(uri)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Schedule validation
    const timeout = setTimeout(() => {
      this.validationTimeout.delete(uri)
      this.doValidate(document)
    }, debounceMs)

    this.validationTimeout.set(uri, timeout)
  }

  /**
   * Perform immediate validation (no debouncing)
   */
  validateImmediate(document: TextDocument): void {
    // Clear any pending validation
    const existingTimeout = this.validationTimeout.get(document.uri)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
      this.validationTimeout.delete(document.uri)
    }

    this.doValidate(document)
  }

  /**
   * Clear diagnostics for a document
   */
  clear(uri: string): void {
    // Clear any pending validation
    const existingTimeout = this.validationTimeout.get(uri)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
      this.validationTimeout.delete(uri)
    }

    this.connection.sendDiagnostics({ uri, diagnostics: [] })
  }

  /**
   * Internal validation implementation
   */
  private doValidate(document: TextDocument): void {
    const uri = document.uri
    const text = document.getText()
    const diagnostics: Diagnostic[] = []

    this.logger.debug(`Validating document: ${uri}`)

    // Check if this is an ACP JSON file - validate against schema
    if (this.schemaValidator.isAcpJsonFile(uri)) {
      const result = this.schemaValidator.validate(document)
      diagnostics.push(...result.diagnostics)
      this.logger.debug(`Schema validation: ${result.valid ? 'valid' : result.diagnostics.length + ' errors'}`)
      this.connection.sendDiagnostics({ uri, diagnostics })
      return
    }

    // For non-JSON files, validate ACP annotations
    // Find all ACP annotation occurrences
    const annotationPattern = /@acp:([a-z-]+)(\s*\(([^)]*)\))?/g
    let match: RegExpExecArray | null

    while ((match = annotationPattern.exec(text)) !== null) {
      const fullMatch = match[0]
      const annotationType = match[1]
      const hasParens = match[2] !== undefined
      const value = match[3]

      const startPos = document.positionAt(match.index)
      const endPos = document.positionAt(match.index + fullMatch.length)

      // Check if annotation type is known
      if (!ACP_ANNOTATION_TYPES.includes(annotationType as (typeof ACP_ANNOTATION_TYPES)[number])) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: { start: startPos, end: endPos },
          message: `Unknown ACP annotation type: '${annotationType}'`,
          source: DIAGNOSTIC_SOURCE,
          code: ACPDiagnosticCode.UnknownAnnotationType,
        })
        continue
      }

      // Check if annotation has required parentheses
      if (!hasParens) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: { start: startPos, end: endPos },
          message: `ACP annotation '${annotationType}' requires a value in parentheses`,
          source: DIAGNOSTIC_SOURCE,
          code: ACPDiagnosticCode.InvalidAnnotationSyntax,
        })
        continue
      }

      // Check if value is provided
      if (value === undefined || value.trim() === '') {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: { start: startPos, end: endPos },
          message: `ACP annotation '${annotationType}' requires a non-empty value`,
          source: DIAGNOSTIC_SOURCE,
          code: ACPDiagnosticCode.MissingValue,
        })
        continue
      }

      // Validate value format for specific annotation types
      this.validateAnnotationValue(annotationType, value.trim(), startPos, endPos, diagnostics)
    }

    // Check for malformed annotations (incomplete @acp: prefix)
    const malformedPattern = /@acp:[^a-z-]/g
    while ((match = malformedPattern.exec(text)) !== null) {
      const startPos = document.positionAt(match.index)
      const endPos = document.positionAt(match.index + match[0].length)

      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: { start: startPos, end: endPos },
        message: `Malformed ACP annotation: expected annotation type after '${ACP_ANNOTATION_PREFIX}'`,
        source: DIAGNOSTIC_SOURCE,
        code: ACPDiagnosticCode.InvalidAnnotationSyntax,
      })
    }

    this.logger.debug(`Found ${diagnostics.length} diagnostic(s) in ${uri}`)
    this.connection.sendDiagnostics({ uri, diagnostics })
  }

  /**
   * Validate annotation value format for specific types
   */
  private validateAnnotationValue(
    type: string,
    value: string,
    startPos: { line: number; character: number },
    endPos: { line: number; character: number },
    diagnostics: Diagnostic[]
  ): void {
    switch (type) {
      case 'category':
        // Category should be a quoted string
        if (!this.isQuotedString(value)) {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: startPos, end: endPos },
            message: `Category value should be a quoted string`,
            source: DIAGNOSTIC_SOURCE,
            code: ACPDiagnosticCode.InvalidValue,
          })
        }
        break

      case 'priority': {
        // Priority should be a number
        const numValue = value.replace(/["']/g, '')
        if (isNaN(Number(numValue))) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: startPos, end: endPos },
            message: `Priority value should be a number`,
            source: DIAGNOSTIC_SOURCE,
            code: ACPDiagnosticCode.InvalidValue,
          })
        }
        break
      }

      case 'deprecated':
        // Deprecated can have an optional message or boolean
        // No specific validation needed
        break

      case 'version': {
        // Version should follow semver-like format
        const versionValue = value.replace(/["']/g, '')
        if (!/^\d+(\.\d+)*(-[a-zA-Z0-9]+)?$/.test(versionValue)) {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: startPos, end: endPos },
            message: `Version should follow a semantic versioning format (e.g., "1.0.0")`,
            source: DIAGNOSTIC_SOURCE,
            code: ACPDiagnosticCode.InvalidValue,
          })
        }
        break
      }

      default:
        // Other annotation types should have quoted string values
        if (!this.isQuotedString(value)) {
          diagnostics.push({
            severity: DiagnosticSeverity.Hint,
            range: { start: startPos, end: endPos },
            message: `Consider using a quoted string for the annotation value`,
            source: DIAGNOSTIC_SOURCE,
            code: ACPDiagnosticCode.InvalidValue,
          })
        }
        break
    }
  }

  /**
   * Check if a value is a properly quoted string
   */
  private isQuotedString(value: string): boolean {
    return (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
  }
}
/**
 * @acp:category("parser")
 * @acp:agent-instructions("Base annotation parser class with common parsing logic")
 */

import type { Range, Position } from 'vscode-languageserver'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import {
  type ParsedAnnotation,
  type ParsedComment,
  type ParseResult,
  type VariableReference,
  type AnnotationDiagnostic,
  type AnnotationCategory,
  AnnotationDiagnosticSeverity,
  AnnotationDiagnosticCode,
  getCategoryForNamespace,
  ALL_NAMESPACES,
  isValidLockLevel,
} from './types.js'

/**
 * ACP annotation prefix
 */
const ACP_PREFIX = '@acp:'

/**
 * Annotation pattern: @acp:namespace(value-description|metadata|...)
 * - namespace: identifier (letters, digits, hyphens)
 * - value: quoted string, identifier, or variable reference
 * - description: text after dash separator
 * - metadata: pipe-separated items
 */
const ANNOTATION_PATTERN =
  /@acp:([a-zA-Z][a-zA-Z0-9-]*)(?:\s*\(\s*([^)]*)\s*\))?(?:\s*-\s*([^|]+?))?(?:\s*\|(.+))?$/

/**
 * Variable reference pattern: $identifier.modifier
 */
const VARIABLE_REF_PATTERN = /\$([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?/g

/**
 * Quoted string pattern
 */
const QUOTED_STRING_PATTERN = /^["'](.*)["']$/

/**
 * Base class for annotation parsers
 * Provides common functionality for parsing ACP annotations from comments
 */
export abstract class AnnotationParser {
  protected document: TextDocument

  constructor(document: TextDocument) {
    this.document = document
  }

  /**
   * Parse the document and extract all annotations
   */
  abstract parse(): ParseResult

  /**
   * Extract comments from the document
   * Must be implemented by language-specific parsers
   */
  protected abstract extractComments(): ParsedComment[]

  /**
   * Parse an annotation from a comment content
   */
  protected parseAnnotation(content: string, _commentRange: Range, contentOffset: number): ParsedAnnotation | null {
    // Find @acp: prefix
    const prefixIndex = content.indexOf(ACP_PREFIX)
    if (prefixIndex === -1) {
      return null
    }

    // Extract the annotation text from the prefix onwards
    const annotationText = content.slice(prefixIndex)

    // Match against pattern
    const match = annotationText.match(ANNOTATION_PATTERN)
    if (!match) {
      // Try simpler pattern for just namespace without value
      const simpleMatch = annotationText.match(/@acp:([a-zA-Z][a-zA-Z0-9-]*)/)
      if (simpleMatch) {
        const namespace = simpleMatch[1]
        const annotationStart = this.offsetToPosition(contentOffset + prefixIndex)
        const annotationEnd = this.offsetToPosition(contentOffset + prefixIndex + simpleMatch[0].length)
        const range: Range = { start: annotationStart, end: annotationEnd }

        const category = this.determineCategory(namespace)
        const diagnostics = this.validateAnnotation(namespace, undefined, range)

        // Add missing value diagnostic for namespaces that require values
        if (!this.isValueOptional(namespace)) {
          diagnostics.push({
            severity: AnnotationDiagnosticSeverity.Error,
            message: `Annotation @acp:${namespace} requires a value`,
            code: AnnotationDiagnosticCode.MissingValue,
            range,
          })
        }

        return {
          raw: simpleMatch[0],
          namespace,
          category,
          value: undefined,
          description: undefined,
          metadata: [],
          range,
          variableRefs: [],
          diagnostics,
        }
      }
      return null
    }

    const [fullMatch, namespace, rawValue, description, metadataStr] = match
    const annotationStart = this.offsetToPosition(contentOffset + prefixIndex)
    const annotationEnd = this.offsetToPosition(contentOffset + prefixIndex + fullMatch.length)
    const range: Range = { start: annotationStart, end: annotationEnd }

    // Parse value (remove quotes if present)
    let value: string | undefined
    if (rawValue !== undefined) {
      value = this.parseValue(rawValue.trim())
    }

    // Parse metadata
    const metadata: string[] = []
    if (metadataStr) {
      metadata.push(...metadataStr.split('|').map((m) => m.trim()).filter(Boolean))
    }

    // Extract variable references
    const variableRefs = this.extractVariableRefs(rawValue || '', contentOffset + prefixIndex, range)

    // Determine category
    const category = this.determineCategory(namespace)

    // Validate and collect diagnostics
    const diagnostics = this.validateAnnotation(namespace, value, range)

    // Add missing value diagnostic for namespaces that require values
    if (value === undefined && !this.isValueOptional(namespace)) {
      diagnostics.push({
        severity: AnnotationDiagnosticSeverity.Error,
        message: `Annotation @acp:${namespace} requires a value`,
        code: AnnotationDiagnosticCode.MissingValue,
        range,
      })
    }

    return {
      raw: fullMatch,
      namespace,
      category,
      value,
      description: description?.trim(),
      metadata,
      range,
      variableRefs,
      diagnostics,
    }
  }

  /**
   * Parse a value, handling quoted strings
   */
  protected parseValue(value: string): string {
    const quotedMatch = value.match(QUOTED_STRING_PATTERN)
    if (quotedMatch) {
      // Unescape the quoted content
      return quotedMatch[1].replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')
    }
    return value
  }

  /**
   * Extract variable references from a value
   */
  protected extractVariableRefs(value: string, baseOffset: number, _parentRange: Range): VariableReference[] {
    const refs: VariableReference[] = []
    let match: RegExpExecArray | null

    // Reset regex
    VARIABLE_REF_PATTERN.lastIndex = 0

    while ((match = VARIABLE_REF_PATTERN.exec(value)) !== null) {
      const start = this.offsetToPosition(baseOffset + match.index)
      const end = this.offsetToPosition(baseOffset + match.index + match[0].length)

      refs.push({
        raw: match[0],
        identifier: match[1],
        modifier: match[2],
        range: { start, end },
      })
    }

    return refs
  }

  /**
   * Determine the category for a namespace
   */
  protected determineCategory(namespace: string): AnnotationCategory {
    const category = getCategoryForNamespace(namespace)
    // Default to 'symbol-level' for unknown namespaces
    return category || 'symbol-level'
  }

  /**
   * Check if a namespace has optional value
   */
  protected isValueOptional(namespace: string): boolean {
    // These namespaces can be used without explicit values
    const optionalValueNamespaces = ['deprecated', 'todo', 'fixme', 'hack', 'debug', 'critical', 'perf']
    return optionalValueNamespaces.includes(namespace)
  }

  /**
   * Validate an annotation and return diagnostics
   */
  protected validateAnnotation(
    namespace: string,
    value: string | undefined,
    range: Range
  ): AnnotationDiagnostic[] {
    const diagnostics: AnnotationDiagnostic[] = []

    // Check if namespace is known
    if (!(ALL_NAMESPACES as readonly string[]).includes(namespace)) {
      diagnostics.push({
        severity: AnnotationDiagnosticSeverity.Warning,
        message: `Unknown namespace '${namespace}'`,
        code: AnnotationDiagnosticCode.UnknownNamespace,
        range,
      })
    }

    // Validate lock level for 'lock' namespace
    if (namespace === 'lock' && value) {
      if (!isValidLockLevel(value)) {
        diagnostics.push({
          severity: AnnotationDiagnosticSeverity.Error,
          message: `Invalid lock level '${value}'. Valid levels: frozen, restricted, approval-required, tests-required, docs-required, review-required, normal, experimental`,
          code: AnnotationDiagnosticCode.InvalidLockLevel,
          range,
        })
      }
    }

    // Validate that required values are present
    if (value === undefined && !this.isValueOptional(namespace)) {
      // Already handled in parseAnnotation for simple matches
    }

    return diagnostics
  }

  /**
   * Convert a document offset to a Position
   */
  protected offsetToPosition(offset: number): Position {
    return this.document.positionAt(offset)
  }

  /**
   * Convert a Position to a document offset
   */
  protected positionToOffset(position: Position): number {
    return this.document.offsetAt(position)
  }

  /**
   * Create a Range from start and end offsets
   */
  protected createRange(startOffset: number, endOffset: number): Range {
    return {
      start: this.offsetToPosition(startOffset),
      end: this.offsetToPosition(endOffset),
    }
  }
}
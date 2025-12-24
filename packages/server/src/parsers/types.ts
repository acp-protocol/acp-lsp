/**
 * @acp:category("types")
 * @acp:agent-instructions("Core types for ACP annotation parsing")
 */

import type { Range } from 'vscode-languageserver'

/**
 * Annotation category based on namespace
 */
export type AnnotationCategory = 'file-level' | 'symbol-level' | 'constraint' | 'inline'

/**
 * Lock level for constraint annotations
 */
export type LockLevel =
  | 'frozen'
  | 'restricted'
  | 'approval-required'
  | 'tests-required'
  | 'docs-required'
  | 'review-required'
  | 'normal'
  | 'experimental'

/**
 * Lock level severity mapping
 */
export const LOCK_LEVEL_SEVERITY: Record<LockLevel, string> = {
  frozen: 'MUST NOT modify',
  restricted: 'Requires approval',
  'approval-required': 'Needs review',
  'tests-required': 'Must have tests',
  'docs-required': 'Must update docs',
  'review-required': 'Needs code review',
  normal: 'Standard rules',
  experimental: 'Changes welcome',
}

/**
 * File-level namespaces
 */
export const FILE_LEVEL_NAMESPACES = [
  'purpose',
  'module',
  'domain',
  'owner',
  'layer',
  'stability',
  'ref',
] as const

/**
 * Symbol-level namespaces
 */
export const SYMBOL_LEVEL_NAMESPACES = [
  'fn',
  'class',
  'method',
  'param',
  'returns',
  'throws',
  'example',
  'deprecated',
] as const

/**
 * Constraint namespaces
 */
export const CONSTRAINT_NAMESPACES = [
  'lock',
  'lock-reason',
  'style',
  'behavior',
  'quality',
  'test',
] as const

/**
 * Inline namespaces
 */
export const INLINE_NAMESPACES = ['critical', 'todo', 'fixme', 'perf', 'hack', 'debug'] as const

/**
 * All known namespaces
 */
export const ALL_NAMESPACES = [
  ...FILE_LEVEL_NAMESPACES,
  ...SYMBOL_LEVEL_NAMESPACES,
  ...CONSTRAINT_NAMESPACES,
  ...INLINE_NAMESPACES,
] as const

export type Namespace = (typeof ALL_NAMESPACES)[number]

/**
 * Variable reference in annotation value
 */
export interface VariableReference {
  /** Full reference string (e.g., "$config.timeout") */
  raw: string
  /** Variable identifier (e.g., "config") */
  identifier: string
  /** Optional modifier after dot (e.g., "timeout") */
  modifier?: string
  /** Range within the annotation */
  range: Range
}

/**
 * Diagnostic severity for annotation issues
 */
export enum AnnotationDiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

/**
 * Diagnostic code for annotation issues
 */
export enum AnnotationDiagnosticCode {
  UnknownNamespace = 'acp-unknown-namespace',
  InvalidSyntax = 'acp-invalid-syntax',
  MissingValue = 'acp-missing-value',
  InvalidValue = 'acp-invalid-value',
  InvalidLockLevel = 'acp-invalid-lock-level',
  UnresolvedVariable = 'acp-unresolved-variable',
  DuplicateAnnotation = 'acp-duplicate',
  MissingDescription = 'acp-missing-description',
}

/**
 * Diagnostic for annotation parsing issues
 */
export interface AnnotationDiagnostic {
  /** Severity of the diagnostic */
  severity: AnnotationDiagnosticSeverity
  /** Human-readable message */
  message: string
  /** Diagnostic code */
  code: AnnotationDiagnosticCode
  /** Range of the issue */
  range: Range
}

/**
 * Parsed annotation from source code
 */
export interface ParsedAnnotation {
  /** Raw annotation text including @acp: prefix */
  raw: string
  /** The namespace (e.g., 'fn', 'lock', 'purpose') */
  namespace: string
  /** Category derived from namespace */
  category: AnnotationCategory
  /** Primary value/directive */
  value?: string
  /** Description after dash separator */
  description?: string
  /** Metadata items after pipe separators */
  metadata: string[]
  /** Source location range */
  range: Range
  /** Variable references found in the annotation */
  variableRefs: VariableReference[]
  /** Parsing diagnostics */
  diagnostics: AnnotationDiagnostic[]
}

/**
 * Comment type in source code
 */
export type CommentType = 'line' | 'block' | 'doc'

/**
 * Parsed comment from source code
 */
export interface ParsedComment {
  /** Comment type */
  type: CommentType
  /** Comment content (without delimiters) */
  content: string
  /** Source location range */
  range: Range
  /** Start offset in document */
  startOffset: number
  /** End offset in document */
  endOffset: number
}

/**
 * Parser result for a document
 */
export interface ParseResult {
  /** All parsed annotations */
  annotations: ParsedAnnotation[]
  /** All comments found */
  comments: ParsedComment[]
  /** Document-level diagnostics */
  diagnostics: AnnotationDiagnostic[]
}

/**
 * Get category for a namespace
 */
export function getCategoryForNamespace(namespace: string): AnnotationCategory | null {
  if ((FILE_LEVEL_NAMESPACES as readonly string[]).includes(namespace)) {
    return 'file-level'
  }
  if ((SYMBOL_LEVEL_NAMESPACES as readonly string[]).includes(namespace)) {
    return 'symbol-level'
  }
  if ((CONSTRAINT_NAMESPACES as readonly string[]).includes(namespace)) {
    return 'constraint'
  }
  if ((INLINE_NAMESPACES as readonly string[]).includes(namespace)) {
    return 'inline'
  }
  return null
}

/**
 * Check if a string is a valid lock level
 */
export function isValidLockLevel(value: string): value is LockLevel {
  return Object.keys(LOCK_LEVEL_SEVERITY).includes(value)
}
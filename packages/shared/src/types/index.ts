/**
 * @acp:category("types")
 * @acp:agent-instructions("Type definitions for ACP Language Server")
 */

/**
 * ACP annotation parsed from source code
 */
export interface ACPAnnotation {
  /** The annotation type (e.g., 'category', 'agent-instructions') */
  type: string
  /** The annotation value */
  value: string
  /** Location in the source file */
  location: SourceLocation
  /** Raw annotation text */
  raw: string
}

/**
 * Location within a source file
 */
export interface SourceLocation {
  /** File path */
  file: string
  /** Starting line (1-indexed) */
  startLine: number
  /** Starting column (1-indexed) */
  startColumn: number
  /** Ending line (1-indexed) */
  endLine: number
  /** Ending column (1-indexed) */
  endColumn: number
}

/**
 * Diagnostic severity levels
 */
export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

/**
 * A diagnostic message for an ACP issue
 */
export interface ACPDiagnostic {
  /** Severity of the diagnostic */
  severity: DiagnosticSeverity
  /** Human-readable message */
  message: string
  /** Location of the issue */
  location: SourceLocation
  /** Optional code for the diagnostic */
  code?: string
  /** Optional source identifier */
  source?: string
}

/**
 * Configuration for the ACP language server
 */
export interface ACPServerConfig {
  /** Whether the server is enabled */
  enabled: boolean
  /** Validation settings */
  validation: {
    enabled: boolean
  }
  /** Tracing level */
  trace: 'off' | 'messages' | 'verbose'
}

/**
 * Supported programming languages for annotation parsing
 */
export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'java'
  | 'csharp'
  | 'cpp'
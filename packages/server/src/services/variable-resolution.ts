/**
 * Variable Resolution Service for ACP
 *
 * Expands $PREFIX_NAME.modifier references to their full values.
 * Supports symbol, file, and domain variable types with modifiers.
 */

import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { DocumentManager } from '../documents/manager.js'
import type { Logger } from '../utils/logger.js'

/**
 * Variable prefixes for auto-generated variables
 */
export type VariablePrefix = 'SYM' | 'FILE' | 'DOM'

/**
 * Variable entry type in .acp.vars.json
 */
export type VariableType = 'symbol' | 'file' | 'domain' | 'string'

/**
 * Variable entry from .acp.vars.json
 */
export interface VariableEntry {
  type?: VariableType
  value: string
  description?: string
}

/**
 * Parsed variable reference
 */
export interface ParsedVariable {
  /** Full match string including $ */
  fullMatch: string
  /** Variable identifier without $ */
  identifier: string
  /** Optional modifier (full, ref, signature) */
  modifier?: string
  /** Start position in text */
  start: number
  /** End position in text */
  end: number
  /** Whether this is a built-in variable */
  isBuiltin: boolean
  /** Inferred type from prefix */
  inferredType?: VariableType
}

/**
 * Resolved variable result
 */
export interface ResolvedVariable {
  /** Variable name */
  name: string
  /** Variable type */
  type: VariableType
  /** Raw value from vars file or cache */
  value: string
  /** Human-readable summary */
  summary: string
  /** Full object data for .full modifier */
  full: Record<string, unknown>
  /** Reference string for .ref modifier */
  ref: string
  /** Function/method signature for .signature modifier */
  signature?: string
  /** Description from vars file */
  description?: string
  /** Source file where variable is defined */
  source: string
  /** Line number where variable is defined (0 if unknown) */
  definitionLine: number
}

/**
 * Resolution error result
 */
export interface ResolutionError {
  type: 'circular' | 'depth' | 'undefined' | 'invalid' | 'parse'
  message: string
  chain?: string[]
}

/**
 * Resolution result - either success or error
 */
export type ResolutionResult =
  | { success: true; variable: ResolvedVariable }
  | { success: false; error: ResolutionError }

/**
 * Built-in variable information
 */
export interface BuiltinVariable {
  description: string
  expansion: string
  contextual: boolean
}

/**
 * Valid modifiers for variable expansion
 */
export const VALID_MODIFIERS = ['full', 'ref', 'signature'] as const
export type Modifier = (typeof VALID_MODIFIERS)[number]

/**
 * Built-in variables that are always available
 */
export const BUILTIN_VARIABLES: Record<string, BuiltinVariable> = {
  FILE: {
    description: 'Current file path relative to workspace root',
    expansion: 'src/example.ts',
    contextual: true,
  },
  LINE: {
    description: 'Current line number in the file',
    expansion: '42',
    contextual: true,
  },
  FUNCTION: {
    description: 'Name of the enclosing function or method',
    expansion: 'handleRequest',
    contextual: true,
  },
  CLASS: {
    description: 'Name of the enclosing class',
    expansion: 'UserService',
    contextual: true,
  },
  MODULE: {
    description: 'Module name from @acp:module annotation',
    expansion: 'AuthModule',
    contextual: true,
  },
}

/**
 * Variable naming pattern: must start with uppercase letter, followed by uppercase letters, digits, or underscores
 */
const VARIABLE_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/

/**
 * Variable reference pattern in text: $NAME or $NAME.modifier
 */
const VARIABLE_REFERENCE_PATTERN = /\$\$|\$([A-Z][A-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?/g

/**
 * Maximum expansion depth to prevent infinite recursion
 */
const MAX_DEPTH = 10

/**
 * Variable Resolution Service
 *
 * Provides variable expansion for ACP annotations with support for:
 * - Symbol variables ($SYM_NAME)
 * - File variables ($FILE_NAME)
 * - Domain variables ($DOM_NAME)
 * - Custom variables from .acp.vars.json
 * - Built-in variables ($FILE, $LINE, etc.)
 * - Modifiers (.full, .ref, .signature)
 * - Circular reference detection
 * - Escape sequence ($$) handling
 */
export class VariableResolutionService {
  private documentManager: DocumentManager
  private logger: Logger
  private expansionStack: Set<string> = new Set()
  private varsCache: Map<string, { variables: Record<string, VariableEntry | string>; source: string }> = new Map()

  constructor(documentManager: DocumentManager, logger: Logger) {
    this.documentManager = documentManager
    this.logger = logger
  }

  /**
   * Parse all variable references in text
   */
  parseVariables(text: string): ParsedVariable[] {
    const variables: ParsedVariable[] = []
    let match: RegExpExecArray | null

    // Reset lastIndex for global regex
    VARIABLE_REFERENCE_PATTERN.lastIndex = 0

    while ((match = VARIABLE_REFERENCE_PATTERN.exec(text)) !== null) {
      // Skip escaped $$ sequences
      if (match[0] === '$$') {
        continue
      }

      const identifier = match[1]
      const modifier = match[2]

      variables.push({
        fullMatch: match[0],
        identifier,
        modifier,
        start: match.index,
        end: match.index + match[0].length,
        isBuiltin: identifier in BUILTIN_VARIABLES,
        inferredType: this.inferTypeFromPrefix(identifier),
      })
    }

    return variables
  }

  /**
   * Find variable at a specific position in text
   */
  findVariableAtPosition(text: string, offset: number): ParsedVariable | null {
    const variables = this.parseVariables(text)
    return variables.find((v) => offset >= v.start && offset <= v.end) || null
  }

  /**
   * Validate variable name follows the naming pattern
   */
  validateVariableName(name: string): boolean {
    return VARIABLE_NAME_PATTERN.test(name)
  }

  /**
   * Infer variable type from prefix
   */
  inferTypeFromPrefix(name: string): VariableType | undefined {
    if (name.startsWith('SYM_')) return 'symbol'
    if (name.startsWith('FILE_')) return 'file'
    if (name.startsWith('DOM_')) return 'domain'
    return undefined
  }

  /**
   * Resolve a variable to its value
   */
  resolve(document: TextDocument, identifier: string, modifier?: string): ResolutionResult {
    this.logger.debug(`Resolving variable: $${identifier}${modifier ? `.${modifier}` : ''}`)

    // Validate name pattern
    if (!this.validateVariableName(identifier)) {
      return {
        success: false,
        error: {
          type: 'invalid',
          message: `Invalid variable name: '${identifier}'. Must match pattern ^[A-Z][A-Z0-9_]+$`,
        },
      }
    }

    // Validate modifier if provided
    if (modifier && !VALID_MODIFIERS.includes(modifier as Modifier)) {
      return {
        success: false,
        error: {
          type: 'invalid',
          message: `Unknown modifier: '${modifier}'. Valid modifiers: ${VALID_MODIFIERS.join(', ')}`,
        },
      }
    }

    // Check for circular reference
    if (this.expansionStack.has(identifier)) {
      const chain = [...this.expansionStack, identifier]
      return {
        success: false,
        error: {
          type: 'circular',
          message: `Circular reference detected: ${chain.join(' → ')}`,
          chain,
        },
      }
    }

    // Check depth limit
    if (this.expansionStack.size >= MAX_DEPTH) {
      return {
        success: false,
        error: {
          type: 'depth',
          message: `Maximum expansion depth (${MAX_DEPTH}) exceeded`,
          chain: [...this.expansionStack],
        },
      }
    }

    // Check for built-in variable
    if (identifier in BUILTIN_VARIABLES) {
      const builtin = BUILTIN_VARIABLES[identifier]
      return {
        success: true,
        variable: {
          name: identifier,
          type: 'string',
          value: builtin.expansion,
          summary: builtin.description,
          full: { type: 'builtin', ...builtin },
          ref: `$${identifier}`,
          description: builtin.description,
          source: 'built-in',
          definitionLine: 0,
        },
      }
    }

    // Add to expansion stack for circular detection
    this.expansionStack.add(identifier)

    try {
      // Try to resolve from .acp.vars.json files
      const resolved = this.resolveFromVarsFiles(document, identifier)
      if (resolved) {
        return { success: true, variable: resolved }
      }

      // Variable not found
      return {
        success: false,
        error: {
          type: 'undefined',
          message: `Undefined variable: '${identifier}'. Define it in .acp.vars.json or use a built-in variable.`,
        },
      }
    } finally {
      // Remove from expansion stack
      this.expansionStack.delete(identifier)
    }
  }

  /**
   * Resolve a variable and apply modifier transformation
   */
  resolveWithModifier(document: TextDocument, identifier: string, modifier?: string): string {
    const result = this.resolve(document, identifier, modifier)

    if (!result.success) {
      return `[ERROR: ${result.error.message}]`
    }

    if (!modifier) {
      return result.variable.value
    }

    return this.applyModifier(result.variable, modifier as Modifier)
  }

  /**
   * Apply modifier transformation to resolved variable
   */
  applyModifier(variable: ResolvedVariable, modifier: Modifier): string {
    switch (modifier) {
      case 'full':
        return JSON.stringify(variable.full, null, 2)
      case 'ref':
        return variable.ref
      case 'signature':
        return variable.signature || variable.summary
      default:
        return variable.value
    }
  }

  /**
   * Expand all variables in text, handling escape sequences
   */
  expandAll(document: TextDocument, text: string): string {
    // First, replace $$ with a placeholder
    const placeholder = '\x00ESCAPED_DOLLAR\x00'
    let result = text.replace(/\$\$/g, placeholder)

    // Parse and expand variables
    const variables = this.parseVariables(result)

    // Process in reverse order to maintain positions
    for (let i = variables.length - 1; i >= 0; i--) {
      const v = variables[i]
      const expanded = this.resolveWithModifier(document, v.identifier, v.modifier)
      result = result.slice(0, v.start) + expanded + result.slice(v.end)
    }

    // Restore escaped dollars as single $
    result = result.replace(new RegExp(placeholder, 'g'), '$')

    return result
  }

  /**
   * Get all available variables (from vars files and built-ins)
   */
  getAvailableVariables(_document: TextDocument): Array<{ name: string; type: VariableType; source: string }> {
    const variables: Array<{ name: string; type: VariableType; source: string }> = []

    // Add built-in variables
    for (const name of Object.keys(BUILTIN_VARIABLES)) {
      variables.push({ name, type: 'string', source: 'built-in' })
    }

    // Add variables from .acp.vars.json files
    this.refreshVarsCache()
    for (const [, data] of this.varsCache) {
      for (const [name, entry] of Object.entries(data.variables)) {
        const type = typeof entry === 'object' ? (entry.type || 'string') : 'string'
        variables.push({ name, type: type as VariableType, source: data.source })
      }
    }

    return variables
  }

  /**
   * Check if a variable is defined
   */
  isDefined(_document: TextDocument, identifier: string): boolean {
    if (identifier in BUILTIN_VARIABLES) {
      return true
    }

    this.refreshVarsCache()
    for (const [, data] of this.varsCache) {
      if (identifier in data.variables) {
        return true
      }
    }

    return false
  }

  /**
   * Clear resolution state (call between resolution chains)
   */
  clearState(): void {
    this.expansionStack.clear()
  }

  /**
   * Refresh the vars file cache from open documents
   */
  private refreshVarsCache(): void {
    this.varsCache.clear()

    const varsDocuments = this.documentManager.all().filter((doc) => {
      const metadata = this.documentManager.getMetadata(doc.uri)
      return metadata?.isAcpVars
    })

    for (const varsDoc of varsDocuments) {
      try {
        const content = JSON.parse(varsDoc.getText())
        if (content.variables && typeof content.variables === 'object') {
          this.varsCache.set(varsDoc.uri, {
            variables: content.variables,
            source: varsDoc.uri.split('/').pop() || varsDoc.uri,
          })
        }
      } catch (e) {
        this.logger.warn(`Failed to parse vars file ${varsDoc.uri}: ${e}`)
      }
    }
  }

  /**
   * Resolve variable from .acp.vars.json files
   */
  private resolveFromVarsFiles(_document: TextDocument, identifier: string): ResolvedVariable | null {
    this.refreshVarsCache()

    for (const [uri, data] of this.varsCache) {
      const entry = data.variables[identifier]
      if (entry !== undefined) {
        return this.createResolvedVariable(identifier, entry, data.source, uri)
      }
    }

    return null
  }

  /**
   * Create a resolved variable from an entry
   */
  private createResolvedVariable(
    name: string,
    entry: VariableEntry | string,
    source: string,
    sourceUri: string
  ): ResolvedVariable {
    if (typeof entry === 'object' && entry !== null) {
      const type = (entry.type || this.inferTypeFromPrefix(name) || 'string') as VariableType
      return {
        name,
        type,
        value: String(entry.value),
        summary: entry.description || String(entry.value),
        full: { name, ...entry },
        ref: this.createReference(name, type, entry.value),
        signature: type === 'symbol' ? entry.value : undefined,
        description: entry.description,
        source,
        definitionLine: this.findDefinitionLine(sourceUri, name),
      }
    } else {
      const type = this.inferTypeFromPrefix(name) || 'string'
      return {
        name,
        type,
        value: String(entry),
        summary: String(entry),
        full: { name, value: entry, type },
        ref: this.createReference(name, type, String(entry)),
        source,
        definitionLine: this.findDefinitionLine(sourceUri, name),
      }
    }
  }

  /**
   * Create a reference string based on variable type
   */
  private createReference(name: string, type: VariableType, value: string): string {
    switch (type) {
      case 'symbol':
        return `$SYM_${name}`
      case 'file':
        return value
      case 'domain':
        return `@domain:${value}`
      default:
        return value
    }
  }

  /**
   * Find the line number where a variable is defined in a vars file
   */
  private findDefinitionLine(uri: string, variableName: string): number {
    try {
      const doc = this.documentManager.get(uri)
      if (!doc) return 0

      const text = doc.getText()
      const lines = text.split('\n')

      for (let i = 0; i < lines.length; i++) {
        // Look for the variable name as a JSON key
        if (lines[i].includes(`"${variableName}"`)) {
          return i + 1 // 1-based line number
        }
      }
    } catch {
      // Ignore errors
    }

    return 0
  }
}
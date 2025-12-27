/**
 * @acp:category("provider")
 * @acp:agent-instructions("Hover provider for rich, contextual information on ACP annotations, variables, and symbols")
 */

import { Hover, HoverParams, MarkupKind, type Range, type Position } from 'vscode-languageserver'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { DocumentManager } from '../documents/manager.js'
import type { Logger } from '../utils/logger.js'
import {
  ALL_NAMESPACES,
  type LockLevel,
  getCategoryForNamespace,
} from '../parsers/types.js'

/**
 * Annotation match result from cursor position detection
 */
interface AnnotationMatch {
  /** Full annotation text */
  raw: string
  /** Namespace (e.g., 'lock', 'fn', 'purpose') */
  namespace: string
  /** Primary value (if present) */
  value?: string
  /** Description after dash separator */
  description?: string
  /** Metadata items after pipe separators */
  metadata: string[]
  /** Range of the annotation in the document */
  range: Range
}

/**
 * Variable reference match
 */
interface VariableMatch {
  /** Full variable reference (e.g., "$CONFIG.timeout") */
  raw: string
  /** Variable identifier */
  identifier: string
  /** Optional modifier */
  modifier?: string
  /** Range of the variable reference */
  range: Range
}

/**
 * Documentation for each namespace
 */
const NAMESPACE_DOCS: Record<
  string,
  { description: string; category: string; example: string; aiGuidance?: string }
> = {
  // File-level
  purpose: {
    description: 'File-level purpose description explaining what this file/module does',
    category: 'File-level',
    example: '@acp:purpose("Authentication middleware") - Handles JWT validation',
    aiGuidance: 'AI agents should understand the primary responsibility of this file',
  },
  module: {
    description: 'Module or component name for organizational grouping',
    category: 'File-level',
    example: '@acp:module("AuthService")',
    aiGuidance: 'Helps AI understand module boundaries and dependencies',
  },
  domain: {
    description: 'Business domain this code belongs to',
    category: 'File-level',
    example: '@acp:domain("user-management")',
    aiGuidance: 'AI uses this to scope changes and understand context',
  },
  owner: {
    description: 'Code owner or responsible team',
    category: 'File-level',
    example: '@acp:owner("platform-team")',
    aiGuidance: 'AI may flag changes to owned code for review',
  },
  layer: {
    description: 'Architecture layer (handler, service, repository, model, util)',
    category: 'File-level',
    example: '@acp:layer("service")',
    aiGuidance: 'AI respects layer boundaries when suggesting changes',
  },
  stability: {
    description: 'API stability indicator (stable, experimental, deprecated)',
    category: 'File-level',
    example: '@acp:stability("stable")',
    aiGuidance: 'AI is more cautious with stable APIs, more flexible with experimental',
  },
  ref: {
    description: 'External reference URL for documentation or specifications',
    category: 'File-level',
    example: '@acp:ref("https://docs.example.com/auth")',
  },

  // Symbol-level
  fn: {
    description: 'Function documentation with purpose and behavior',
    category: 'Symbol-level',
    example: '@acp:fn("validateToken") - Validates JWT and returns claims',
    aiGuidance: 'AI uses this to understand function contracts',
  },
  class: {
    description: 'Class documentation with purpose and responsibilities',
    category: 'Symbol-level',
    example: '@acp:class("UserRepository") - Handles user data persistence',
  },
  method: {
    description: 'Method documentation with behavior description',
    category: 'Symbol-level',
    example: '@acp:method("findById") - Retrieves user by ID from database',
  },
  param: {
    description: 'Parameter documentation with type and constraints',
    category: 'Symbol-level',
    example: '@acp:param("userId", "string") - Unique user identifier',
  },
  returns: {
    description: 'Return value documentation with type and description',
    category: 'Symbol-level',
    example: '@acp:returns("User | null") - The user object or null if not found',
  },
  throws: {
    description: 'Exception documentation with conditions',
    category: 'Symbol-level',
    example: '@acp:throws("AuthError") - When token is invalid or expired',
  },
  example: {
    description: 'Usage example for the symbol',
    category: 'Symbol-level',
    example: '@acp:example("const user = await repo.findById(id)")',
  },
  deprecated: {
    description: 'Deprecation notice with migration guidance',
    category: 'Symbol-level',
    example: '@acp:deprecated("Use AuthService.validate() instead")',
    aiGuidance: 'AI should suggest using the replacement when possible',
  },

  // Constraint
  lock: {
    description: 'Modification constraint level controlling how code can be changed',
    category: 'Constraint',
    example: '@acp:lock("frozen") - Critical security code',
    aiGuidance: 'AI MUST respect lock levels when making changes',
  },
  'lock-reason': {
    description: 'Explanation for why the lock constraint exists',
    category: 'Constraint',
    example: '@acp:lock-reason("Audited for SOC2 compliance")',
  },
  style: {
    description: 'Code style requirements or patterns to follow',
    category: 'Constraint',
    example: '@acp:style("functional") - Use pure functions only',
    aiGuidance: 'AI should maintain the specified coding style',
  },
  behavior: {
    description: 'Behavioral constraints and invariants',
    category: 'Constraint',
    example: '@acp:behavior("idempotent") - Must be safe to retry',
    aiGuidance: 'AI must preserve these behavioral guarantees',
  },
  quality: {
    description: 'Quality requirements (coverage, complexity, etc.)',
    category: 'Constraint',
    example: '@acp:quality("coverage:90%")',
  },
  test: {
    description: 'Testing requirements and constraints',
    category: 'Constraint',
    example: '@acp:test("integration") - Requires integration tests',
    aiGuidance: 'AI should include tests matching requirements when modifying',
  },

  // Inline
  critical: {
    description: 'Marks code as critical and requiring extra review',
    category: 'Inline',
    example: '@acp:critical - Payment processing logic',
    aiGuidance: 'AI should be extra careful and flag any changes for review',
  },
  todo: {
    description: 'TODO marker for planned work',
    category: 'Inline',
    example: '@acp:todo("Add rate limiting")',
  },
  fixme: {
    description: 'FIXME marker for known issues',
    category: 'Inline',
    example: '@acp:fixme("Handle edge case for empty input")',
  },
  perf: {
    description: 'Performance consideration or optimization note',
    category: 'Inline',
    example: '@acp:perf("O(n²) - consider caching for large datasets")',
    aiGuidance: 'AI should consider performance when suggesting changes here',
  },
  hack: {
    description: 'Temporary workaround that should be revisited',
    category: 'Inline',
    example: '@acp:hack("Workaround for API bug, remove after v2.0")',
  },
  debug: {
    description: 'Debug marker for development-only code',
    category: 'Inline',
    example: '@acp:debug - Remove before production',
    aiGuidance: 'AI should suggest removing this before production',
  },
}

/**
 * Lock levels with full descriptions for hover
 */
const LOCK_LEVEL_DETAILS: Record<
  LockLevel,
  { description: string; aiGuidance: string; severity: number }
> = {
  frozen: {
    description: 'MUST NOT modify under any circumstances',
    aiGuidance: 'AI agents are strictly prohibited from modifying this code',
    severity: 1,
  },
  restricted: {
    description: 'Modifications require explicit approval',
    aiGuidance: 'AI must explain proposed changes and request approval before modifying',
    severity: 2,
  },
  'approval-required': {
    description: 'Changes need review approval',
    aiGuidance: 'AI should flag changes for human review before applying',
    severity: 3,
  },
  'tests-required': {
    description: 'Must have tests before changes',
    aiGuidance: 'AI must include tests with any modifications to this code',
    severity: 4,
  },
  'docs-required': {
    description: 'Must update docs with changes',
    aiGuidance: 'AI must update documentation when modifying this code',
    severity: 5,
  },
  'review-required': {
    description: 'Changes need code review',
    aiGuidance: 'AI should request code review for changes',
    severity: 6,
  },
  normal: {
    description: 'Standard modification rules apply',
    aiGuidance: 'AI can modify following normal best practices',
    severity: 7,
  },
  experimental: {
    description: 'Code is experimental, changes welcome',
    aiGuidance: 'AI can freely experiment and refactor this code',
    severity: 8,
  },
}

/**
 * Layer descriptions
 */
const LAYER_DESCRIPTIONS: Record<string, string> = {
  handler: 'HTTP/API request handlers - entry point for external requests',
  controller: 'Business logic orchestration - coordinates between services',
  service: 'Domain business logic - core application functionality',
  repository: 'Data access layer - database and storage operations',
  model: 'Domain models and entities - data structures',
  util: 'Utility functions and helpers - shared functionality',
  config: 'Configuration and constants - settings and parameters',
  middleware: 'Request/response middleware - cross-cutting concerns',
  validator: 'Input validation logic - data verification',
  mapper: 'Data transformation and mapping - format conversion',
}

/**
 * Stability descriptions
 */
const STABILITY_DESCRIPTIONS: Record<string, { description: string; aiGuidance: string }> = {
  stable: {
    description: 'API is stable and follows semver',
    aiGuidance: 'Breaking changes require major version bump',
  },
  experimental: {
    description: 'API may change without notice',
    aiGuidance: 'AI can suggest breaking changes more freely',
  },
  deprecated: {
    description: 'API is deprecated and will be removed',
    aiGuidance: 'AI should suggest migration to replacement',
  },
}

/**
 * Variable modifier descriptions
 */
const MODIFIER_DESCRIPTIONS: Record<string, string> = {
  full: 'Full qualified reference with complete details',
  ref: 'Reference link to the symbol definition',
  signature: 'Function/method signature only',
}

/**
 * Hover provider for ACP annotations
 */
export class HoverProvider {
  private documentManager: DocumentManager
  private logger: Logger

  constructor(documentManager: DocumentManager, logger: Logger) {
    this.documentManager = documentManager
    this.logger = logger
  }

  /**
   * Handle hover request
   */
  onHover(params: HoverParams): Hover | null {
    const document = this.documentManager.get(params.textDocument.uri)
    if (!document) {
      return null
    }

    this.logger.debug(`Hover request at ${params.position.line}:${params.position.character}`)

    // Try variable hover first (more specific), then annotation
    return (
      this.getVariableHover(document, params.position) ||
      this.getAnnotationHover(document, params.position) ||
      null
    )
  }

  /**
   * Get hover for an ACP annotation
   */
  private getAnnotationHover(document: TextDocument, position: Position): Hover | null {
    const annotation = this.getAnnotationAtPosition(document, position)
    if (!annotation) {
      return null
    }

    const content = this.formatAnnotationHover(annotation)
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: content,
      },
      range: annotation.range,
    }
  }

  /**
   * Get hover for a variable reference
   */
  private getVariableHover(document: TextDocument, position: Position): Hover | null {
    const variable = this.getVariableAtPosition(document, position)
    if (!variable) {
      return null
    }

    const content = this.formatVariableHover(document, variable)
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: content,
      },
      range: variable.range,
    }
  }

  /**
   * Detect an ACP annotation at the given position
   */
  private getAnnotationAtPosition(document: TextDocument, position: Position): AnnotationMatch | null {
    const text = document.getText()
    const lineStart = document.offsetAt({ line: position.line, character: 0 })
    const lineEnd = text.indexOf('\n', lineStart)
    const lineText = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd)

    // Find @acp: in the line
    const acpIndex = lineText.indexOf('@acp:')
    if (acpIndex === -1) {
      return null
    }

    // Pattern: @acp:namespace(value) - description | metadata
    // Use $ to match end of line (not just any whitespace) for proper description capture
    const pattern = /@acp:([a-zA-Z][a-zA-Z0-9-]*)(?:\s*\(\s*([^)]*)\s*\))?(?:\s*-\s*([^|\n]+?))?(?:\s*\|(.+))?$/
    const afterAcp = lineText.substring(acpIndex)
    const match = afterAcp.match(pattern)

    if (!match) {
      // Try simpler pattern for just namespace
      const simpleMatch = afterAcp.match(/@acp:([a-zA-Z][a-zA-Z0-9-]*)/)
      if (simpleMatch) {
        const startChar = acpIndex
        const endChar = acpIndex + simpleMatch[0].length

        // Check if position is within the annotation
        if (position.character < startChar || position.character > endChar) {
          return null
        }

        return {
          raw: simpleMatch[0],
          namespace: simpleMatch[1],
          metadata: [],
          range: {
            start: { line: position.line, character: startChar },
            end: { line: position.line, character: endChar },
          },
        }
      }
      return null
    }

    const [fullMatch, namespace, rawValue, description, metadataStr] = match
    const startChar = acpIndex
    const endChar = acpIndex + fullMatch.length

    // Check if position is within the annotation
    if (position.character < startChar || position.character > endChar) {
      return null
    }

    // Parse value (remove quotes if present)
    let value: string | undefined
    if (rawValue !== undefined) {
      const trimmed = rawValue.trim()
      const quotedMatch = trimmed.match(/^["'](.*)["']$/)
      value = quotedMatch ? quotedMatch[1] : trimmed
    }

    // Parse metadata
    const metadata: string[] = []
    if (metadataStr) {
      metadata.push(
        ...metadataStr
          .split('|')
          .map((m) => m.trim())
          .filter(Boolean)
      )
    }

    return {
      raw: fullMatch,
      namespace,
      value,
      description: description?.trim(),
      metadata,
      range: {
        start: { line: position.line, character: startChar },
        end: { line: position.line, character: endChar },
      },
    }
  }

  /**
   * Detect a variable reference at the given position
   */
  private getVariableAtPosition(document: TextDocument, position: Position): VariableMatch | null {
    const text = document.getText()
    const lineStart = document.offsetAt({ line: position.line, character: 0 })
    const lineEnd = text.indexOf('\n', lineStart)
    const lineText = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd)

    // Pattern for variable references: $identifier.modifier
    const varPattern = /\$([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?/g
    let match: RegExpExecArray | null

    while ((match = varPattern.exec(lineText)) !== null) {
      const startChar = match.index
      const endChar = match.index + match[0].length

      if (position.character >= startChar && position.character <= endChar) {
        return {
          raw: match[0],
          identifier: match[1],
          modifier: match[2],
          range: {
            start: { line: position.line, character: startChar },
            end: { line: position.line, character: endChar },
          },
        }
      }
    }

    return null
  }

  /**
   * Format hover content for an annotation
   */
  private formatAnnotationHover(annotation: AnnotationMatch): string {
    const { namespace, value, description, metadata } = annotation
    const doc = NAMESPACE_DOCS[namespace]
    const category = getCategoryForNamespace(namespace) || 'unknown'

    let content = `### @acp:${namespace}\n\n`

    // Category badge
    const categoryLabel = doc?.category || this.getCategoryLabel(category)
    content += `**Category:** \`${categoryLabel}\`\n\n`

    // Special handling for lock levels
    if (namespace === 'lock' && value) {
      content += this.formatLockLevelHover(value as LockLevel)
    } else if (namespace === 'layer' && value) {
      content += this.formatLayerHover(value)
    } else if (namespace === 'stability' && value) {
      content += this.formatStabilityHover(value)
    } else {
      // Standard value display
      if (value !== undefined) {
        content += `**Value:** \`${value}\`\n\n`
      }
    }

    // Description
    if (description) {
      content += `**Description:** ${description}\n\n`
    }

    // Metadata
    if (metadata.length > 0) {
      content += `**Metadata:** ${metadata.map((m) => `\`${m}\``).join(', ')}\n\n`
    }

    // Documentation
    if (doc) {
      content += '---\n\n'
      content += `${doc.description}\n\n`

      if (doc.aiGuidance) {
        content += `**AI Guidance:** ${doc.aiGuidance}\n\n`
      }

      content += `**Example:**\n\`\`\`\n${doc.example}\n\`\`\`\n`
    } else if (!(ALL_NAMESPACES as readonly string[]).includes(namespace)) {
      content += '---\n\n'
      content += `⚠️ **Unknown namespace** - This annotation may not be recognized by ACP tools.\n`
    }

    return content
  }

  /**
   * Format lock level hover with visual hierarchy
   */
  private formatLockLevelHover(level: string): string {
    const levels: LockLevel[] = [
      'frozen',
      'restricted',
      'approval-required',
      'tests-required',
      'docs-required',
      'review-required',
      'normal',
      'experimental',
    ]

    const details = LOCK_LEVEL_DETAILS[level as LockLevel]
    if (!details) {
      return `**Level:** \`${level}\` ⚠️ (unknown lock level)\n\n`
    }

    let content = `**Level:** \`${level}\`\n\n`
    content += `**Behavior:** ${details.description}\n\n`
    content += `**AI Guidance:** ${details.aiGuidance}\n\n`
    content += '**Restriction Hierarchy:**\n```\n'

    for (const l of levels) {
      const idx = levels.indexOf(l)
      const barLength = 8 - idx
      const bar = '█'.repeat(barLength) + '░'.repeat(idx)
      const indicator = l === level ? ' ◄ CURRENT' : ''
      content += `${l.padEnd(18)} ${bar}${indicator}\n`
    }

    content += '```\n\n'
    content += `*Severity: ${details.severity}/8 (1 = most restrictive)*\n`

    return content
  }

  /**
   * Format layer hover
   */
  private formatLayerHover(layer: string): string {
    const description = LAYER_DESCRIPTIONS[layer]
    let content = `**Layer:** \`${layer}\`\n\n`

    if (description) {
      content += `${description}\n\n`
    } else {
      content += `⚠️ Unknown layer - standard layers are: ${Object.keys(LAYER_DESCRIPTIONS).join(', ')}\n\n`
    }

    return content
  }

  /**
   * Format stability hover
   */
  private formatStabilityHover(stability: string): string {
    const info = STABILITY_DESCRIPTIONS[stability]
    let content = `**Stability:** \`${stability}\`\n\n`

    if (info) {
      content += `${info.description}\n\n`
      content += `**AI Guidance:** ${info.aiGuidance}\n\n`
    } else {
      content += `⚠️ Unknown stability value - standard values are: stable, experimental, deprecated\n\n`
    }

    return content
  }

  /**
   * Format variable hover
   */
  private formatVariableHover(document: TextDocument, variable: VariableMatch): string {
    const { identifier, modifier } = variable

    let content = `### Variable: \`$${identifier}${modifier ? `.${modifier}` : ''}\`\n\n`

    // Try to resolve the variable from .acp.vars.json
    const resolved = this.resolveVariable(document, identifier)

    if (resolved) {
      content += `**Type:** \`${resolved.type}\`\n\n`
      content += `**Value:** \`${resolved.value}\`\n\n`

      if (resolved.description) {
        content += `**Description:** ${resolved.description}\n\n`
      }

      if (modifier) {
        const modDesc = MODIFIER_DESCRIPTIONS[modifier]
        if (modDesc) {
          content += `**Modifier (${modifier}):** ${modDesc}\n\n`
        } else {
          content += `⚠️ Unknown modifier: \`${modifier}\`\n\n`
        }
      }

      content += `**Source:** ${resolved.source}\n`
    } else {
      // Check for built-in variables
      const builtinInfo = this.getBuiltinVariableInfo(identifier)
      if (builtinInfo) {
        content += `**Type:** Built-in\n\n`
        content += `${builtinInfo.description}\n\n`
        content += `**Expands to:** ${builtinInfo.expansion}\n`
      } else {
        content += `⚠️ **Undefined variable**\n\n`
        content += `This variable is not defined in any \`.acp.vars.json\` file.\n\n`
        content += `**Available options:**\n`
        content += `- Define it in \`.acp.vars.json\`\n`
        content += `- Use a built-in variable: \`$FILE\`, \`$LINE\`, \`$FUNCTION\`, \`$CLASS\`, \`$MODULE\`\n`
      }
    }

    return content
  }

  /**
   * Resolve a variable from .acp.vars.json files
   */
  private resolveVariable(
    _document: TextDocument,
    identifier: string
  ): { type: string; value: string; description?: string; source: string } | null {
    // Get all .acp.vars.json documents
    const varsDocuments = this.documentManager.all().filter((doc) => {
      const metadata = this.documentManager.getMetadata(doc.uri)
      return metadata?.isAcpVars
    })

    for (const varsDoc of varsDocuments) {
      try {
        const varsContent = JSON.parse(varsDoc.getText())
        if (varsContent.variables && typeof varsContent.variables === 'object') {
          const entry = varsContent.variables[identifier]
          if (entry !== undefined) {
            // Handle both simple values and objects with type/value/description
            if (typeof entry === 'object' && entry !== null) {
              return {
                type: entry.type || 'string',
                value: String(entry.value ?? entry),
                description: entry.description,
                source: varsDoc.uri.split('/').pop() || varsDoc.uri,
              }
            } else {
              return {
                type: typeof entry,
                value: String(entry),
                source: varsDoc.uri.split('/').pop() || varsDoc.uri,
              }
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    return null
  }

  /**
   * Get information about built-in variables
   */
  private getBuiltinVariableInfo(
    identifier: string
  ): { description: string; expansion: string } | null {
    const builtins: Record<string, { description: string; expansion: string }> = {
      FILE: {
        description: 'Current file path relative to workspace root',
        expansion: '`src/example.ts`',
      },
      LINE: {
        description: 'Current line number in the file',
        expansion: '`42`',
      },
      FUNCTION: {
        description: 'Name of the enclosing function or method',
        expansion: '`handleRequest`',
      },
      CLASS: {
        description: 'Name of the enclosing class',
        expansion: '`UserService`',
      },
      MODULE: {
        description: 'Module name from @acp:module annotation',
        expansion: '`AuthModule`',
      },
    }

    return builtins[identifier] || null
  }

  /**
   * Get category label for display
   */
  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'file-level': 'File-level',
      'symbol-level': 'Symbol-level',
      constraint: 'Constraint',
      inline: 'Inline',
    }
    return labels[category] || category
  }
}
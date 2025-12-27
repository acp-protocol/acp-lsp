/**
 * @acp:category("provider")
 * @acp:agent-instructions("Completion provider for context-aware ACP annotation completions including namespaces, values, and variable references")
 */

import {
  CompletionItem,
  CompletionItemKind,
  CompletionParams,
  InsertTextFormat,
  MarkupKind,
  type CompletionList,
} from 'vscode-languageserver'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { DocumentManager } from '../documents/manager.js'
import type { Logger } from '../utils/logger.js'
import {
  FILE_LEVEL_NAMESPACES,
  SYMBOL_LEVEL_NAMESPACES,
  CONSTRAINT_NAMESPACES,
  INLINE_NAMESPACES,
  type LockLevel,
} from '../parsers/types.js'

/**
 * Trigger context for completions
 */
export type TriggerContext =
  | 'namespace' // After @acp:
  | 'lock-level' // After @acp:lock
  | 'layer' // After @acp:layer
  | 'stability' // After @acp:stability
  | 'variable' // After $
  | 'variable-modifier' // After $VAR.
  | 'json-property' // In JSON file at property position
  | 'none'

/**
 * Documentation for each namespace
 */
const NAMESPACE_DOCS: Record<string, { description: string; example: string }> = {
  // File-level
  purpose: {
    description: 'File-level purpose description explaining what this file/module does',
    example: '@acp:purpose("Authentication middleware") - Handles JWT validation',
  },
  module: {
    description: 'Module or component name for organizational grouping',
    example: '@acp:module("AuthService")',
  },
  domain: {
    description: 'Business domain this code belongs to',
    example: '@acp:domain("user-management")',
  },
  owner: {
    description: 'Code owner or responsible team',
    example: '@acp:owner("platform-team")',
  },
  layer: {
    description: 'Architecture layer (handler, service, repository, model, util)',
    example: '@acp:layer("service")',
  },
  stability: {
    description: 'API stability indicator (stable, experimental, deprecated)',
    example: '@acp:stability("stable")',
  },
  ref: {
    description: 'External reference URL for documentation or specifications',
    example: '@acp:ref("https://docs.example.com/auth")',
  },

  // Symbol-level
  fn: {
    description: 'Function documentation with purpose and behavior',
    example: '@acp:fn("validateToken") - Validates JWT and returns claims',
  },
  class: {
    description: 'Class documentation with purpose and responsibilities',
    example: '@acp:class("UserRepository") - Handles user data persistence',
  },
  method: {
    description: 'Method documentation with behavior description',
    example: '@acp:method("findById") - Retrieves user by ID from database',
  },
  param: {
    description: 'Parameter documentation with type and constraints',
    example: '@acp:param("userId", "string") - Unique user identifier',
  },
  returns: {
    description: 'Return value documentation with type and description',
    example: '@acp:returns("User | null") - The user object or null if not found',
  },
  throws: {
    description: 'Exception documentation with conditions',
    example: '@acp:throws("AuthError") - When token is invalid or expired',
  },
  example: {
    description: 'Usage example for the symbol',
    example: '@acp:example("const user = await repo.findById(id)")',
  },
  deprecated: {
    description: 'Deprecation notice with migration guidance',
    example: '@acp:deprecated("Use AuthService.validate() instead")',
  },

  // Constraint
  lock: {
    description: 'Modification constraint level controlling how code can be changed',
    example: '@acp:lock("frozen") - Critical security code',
  },
  'lock-reason': {
    description: 'Explanation for why the lock constraint exists',
    example: '@acp:lock-reason("Audited for SOC2 compliance")',
  },
  style: {
    description: 'Code style requirements or patterns to follow',
    example: '@acp:style("functional") - Use pure functions only',
  },
  behavior: {
    description: 'Behavioral constraints and invariants',
    example: '@acp:behavior("idempotent") - Must be safe to retry',
  },
  quality: {
    description: 'Quality requirements (coverage, complexity, etc.)',
    example: '@acp:quality("coverage:90%")',
  },
  test: {
    description: 'Testing requirements and constraints',
    example: '@acp:test("integration") - Requires integration tests',
  },

  // Inline
  critical: {
    description: 'Marks code as critical and requiring extra review',
    example: '@acp:critical - Payment processing logic',
  },
  todo: {
    description: 'TODO marker for planned work',
    example: '@acp:todo("Add rate limiting")',
  },
  fixme: {
    description: 'FIXME marker for known issues',
    example: '@acp:fixme("Handle edge case for empty input")',
  },
  perf: {
    description: 'Performance consideration or optimization note',
    example: '@acp:perf("O(n²) - consider caching for large datasets")',
  },
  hack: {
    description: 'Temporary workaround that should be revisited',
    example: '@acp:hack("Workaround for API bug, remove after v2.0")',
  },
  debug: {
    description: 'Debug marker for development-only code',
    example: '@acp:debug - Remove before production',
  },
}

/**
 * Lock levels in severity order (most restrictive first)
 */
const LOCK_LEVELS: { level: LockLevel; description: string; severity: number }[] = [
  { level: 'frozen', description: 'MUST NOT modify under any circumstances', severity: 1 },
  { level: 'restricted', description: 'Modifications require explicit approval', severity: 2 },
  { level: 'approval-required', description: 'Changes need review approval', severity: 3 },
  { level: 'tests-required', description: 'Must have tests before changes', severity: 4 },
  { level: 'docs-required', description: 'Must update docs with changes', severity: 5 },
  { level: 'review-required', description: 'Changes need code review', severity: 6 },
  { level: 'normal', description: 'Standard modification rules apply', severity: 7 },
  { level: 'experimental', description: 'Code is experimental, changes welcome', severity: 8 },
]

/**
 * Architecture layers
 */
const LAYERS = [
  { name: 'handler', description: 'HTTP/API request handlers' },
  { name: 'controller', description: 'Business logic orchestration' },
  { name: 'service', description: 'Domain business logic' },
  { name: 'repository', description: 'Data access layer' },
  { name: 'model', description: 'Domain models and entities' },
  { name: 'util', description: 'Utility functions and helpers' },
  { name: 'config', description: 'Configuration and constants' },
  { name: 'middleware', description: 'Request/response middleware' },
  { name: 'validator', description: 'Input validation logic' },
  { name: 'mapper', description: 'Data transformation and mapping' },
]

/**
 * Stability values
 */
const STABILITY_VALUES = [
  { name: 'stable', description: 'API is stable and follows semver' },
  { name: 'experimental', description: 'API may change without notice' },
  { name: 'deprecated', description: 'API is deprecated and will be removed' },
]

/**
 * Variable modifiers for $VAR. completions
 */
const VARIABLE_MODIFIERS = [
  { name: 'full', description: 'Full qualified reference' },
  { name: 'ref', description: 'Reference link to symbol' },
  { name: 'signature', description: 'Function/method signature' },
]

/**
 * Completion provider for ACP annotations
 */
export class CompletionProvider {
  private documentManager: DocumentManager
  private logger: Logger

  constructor(documentManager: DocumentManager, logger: Logger) {
    this.documentManager = documentManager
    this.logger = logger
  }

  /**
   * Handle completion request
   */
  onCompletion(params: CompletionParams): CompletionList | CompletionItem[] {
    const document = this.documentManager.get(params.textDocument.uri)
    if (!document) {
      return []
    }

    const context = this.detectTriggerContext(document, params)
    this.logger.debug(`Completion context: ${context}`)

    switch (context.type) {
      case 'namespace':
        return this.getNamespaceCompletions(context.prefix)
      case 'lock-level':
        return this.getLockLevelCompletions()
      case 'layer':
        return this.getLayerCompletions()
      case 'stability':
        return this.getStabilityCompletions()
      case 'variable':
        return this.getVariableCompletions(document, context.prefix)
      case 'variable-modifier':
        return this.getVariableModifierCompletions()
      case 'json-property':
        return this.getJsonPropertyCompletions(document, params)
      default:
        return []
    }
  }

  /**
   * Handle completion item resolve for additional details
   */
  onCompletionResolve(item: CompletionItem): CompletionItem {
    // Add additional documentation if available
    if (item.data?.namespace && NAMESPACE_DOCS[item.data.namespace]) {
      const doc = NAMESPACE_DOCS[item.data.namespace]
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: `${doc.description}\n\n**Example:**\n\`\`\`\n${doc.example}\n\`\`\``,
      }
    }
    return item
  }

  /**
   * Detect the trigger context based on cursor position
   */
  private detectTriggerContext(
    document: TextDocument,
    params: CompletionParams
  ): { type: TriggerContext; prefix: string } {
    const text = document.getText()
    const offset = document.offsetAt(params.position)

    // Get the text from start of line to cursor
    const lineStart = text.lastIndexOf('\n', offset - 1) + 1
    const lineText = text.substring(lineStart, offset)

    // Check for JSON file
    const uri = document.uri
    if (uri.endsWith('.json')) {
      return { type: 'json-property', prefix: '' }
    }

    // Check for variable modifier: $VAR.
    const varModifierMatch = lineText.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_]*)$/)
    if (varModifierMatch) {
      return { type: 'variable-modifier', prefix: varModifierMatch[2] }
    }

    // Check for variable start: $
    const varMatch = lineText.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)?$/)
    if (varMatch) {
      return { type: 'variable', prefix: varMatch[1] || '' }
    }

    // Check for @acp: annotations
    const acpIndex = lineText.lastIndexOf('@acp:')
    if (acpIndex !== -1) {
      const afterAcp = lineText.substring(acpIndex + 5)

      // Check if we're completing a namespace value (after space or in parentheses)
      const lockMatch = afterAcp.match(/^lock(?:\s+|\s*\(\s*["']?)([a-z-]*)$/)
      if (lockMatch) {
        return { type: 'lock-level', prefix: lockMatch[1] }
      }

      const layerMatch = afterAcp.match(/^layer(?:\s+|\s*\(\s*["']?)([a-z]*)$/)
      if (layerMatch) {
        return { type: 'layer', prefix: layerMatch[1] }
      }

      const stabilityMatch = afterAcp.match(/^stability(?:\s+|\s*\(\s*["']?)([a-z]*)$/)
      if (stabilityMatch) {
        return { type: 'stability', prefix: stabilityMatch[1] }
      }

      // Check if we're still completing the namespace (no space yet)
      if (!afterAcp.includes(' ') && !afterAcp.includes('(')) {
        return { type: 'namespace', prefix: afterAcp }
      }
    }

    // Check if @ was just typed (trigger for @acp:)
    if (lineText.endsWith('@')) {
      return { type: 'namespace', prefix: '' }
    }

    return { type: 'none', prefix: '' }
  }

  /**
   * Get namespace completions
   */
  private getNamespaceCompletions(prefix: string): CompletionItem[] {
    const items: CompletionItem[] = []

    // Group by category for better organization
    const categories = [
      { namespaces: FILE_LEVEL_NAMESPACES, label: 'File-level', sortPrefix: '1' },
      { namespaces: SYMBOL_LEVEL_NAMESPACES, label: 'Symbol-level', sortPrefix: '2' },
      { namespaces: CONSTRAINT_NAMESPACES, label: 'Constraint', sortPrefix: '3' },
      { namespaces: INLINE_NAMESPACES, label: 'Inline', sortPrefix: '4' },
    ]

    for (const category of categories) {
      for (let i = 0; i < category.namespaces.length; i++) {
        const ns = category.namespaces[i]
        if (!prefix || ns.startsWith(prefix)) {
          const doc = NAMESPACE_DOCS[ns]
          const needsValue = !['deprecated', 'todo', 'fixme', 'hack', 'debug', 'critical', 'perf'].includes(ns)

          items.push({
            label: ns,
            kind: CompletionItemKind.Keyword,
            detail: `@acp:${ns} (${category.label})`,
            documentation: doc
              ? {
                  kind: MarkupKind.Markdown,
                  value: `${doc.description}\n\n**Example:**\n\`${doc.example}\``,
                }
              : undefined,
            insertText: needsValue ? `${ns}("\${1:value}")` : ns,
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: `${category.sortPrefix}${String(i).padStart(2, '0')}`,
            data: { namespace: ns },
          })
        }
      }
    }

    return items
  }

  /**
   * Get lock level completions
   */
  private getLockLevelCompletions(): CompletionItem[] {
    return LOCK_LEVELS.map((lock, i) => ({
      label: lock.level,
      kind: CompletionItemKind.EnumMember,
      detail: `Lock level (severity: ${lock.severity}/8)`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: `**${lock.level}**\n\n${lock.description}\n\nSeverity: ${lock.severity}/8 (1 = most restrictive)`,
      },
      insertText: `"${lock.level}"`,
      sortText: String(i).padStart(2, '0'),
    }))
  }

  /**
   * Get layer completions
   */
  private getLayerCompletions(): CompletionItem[] {
    return LAYERS.map((layer, i) => ({
      label: layer.name,
      kind: CompletionItemKind.EnumMember,
      detail: `Architecture layer: ${layer.name}`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: layer.description,
      },
      insertText: `"${layer.name}"`,
      sortText: String(i).padStart(2, '0'),
    }))
  }

  /**
   * Get stability completions
   */
  private getStabilityCompletions(): CompletionItem[] {
    return STABILITY_VALUES.map((s, i) => ({
      label: s.name,
      kind: CompletionItemKind.EnumMember,
      detail: `Stability: ${s.name}`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: s.description,
      },
      insertText: `"${s.name}"`,
      sortText: String(i).padStart(2, '0'),
    }))
  }

  /**
   * Get variable completions from cache/vars files
   */
  private getVariableCompletions(_document: TextDocument, prefix: string): CompletionItem[] {
    const items: CompletionItem[] = []

    // Get variables from .acp.vars.json if available
    const varsDocuments = this.documentManager.all().filter((doc) => {
      const metadata = this.documentManager.getMetadata(doc.uri)
      return metadata?.isAcpVars
    })

    for (const varsDoc of varsDocuments) {
      try {
        const varsContent = JSON.parse(varsDoc.getText())
        if (varsContent.variables && typeof varsContent.variables === 'object') {
          for (const [name, value] of Object.entries(varsContent.variables)) {
            if (!prefix || name.toLowerCase().startsWith(prefix.toLowerCase())) {
              items.push({
                label: name,
                kind: CompletionItemKind.Variable,
                detail: `Variable: $${name}`,
                documentation: {
                  kind: MarkupKind.Markdown,
                  value: `**Value:** \`${String(value)}\`\n\nFrom: ${varsDoc.uri.split('/').pop()}`,
                },
                insertText: name,
                sortText: `0${name}`,
              })
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Add common built-in variables
    const builtins = ['FILE', 'LINE', 'FUNCTION', 'CLASS', 'MODULE']
    for (const builtin of builtins) {
      if (!prefix || builtin.toLowerCase().startsWith(prefix.toLowerCase())) {
        items.push({
          label: builtin,
          kind: CompletionItemKind.Constant,
          detail: `Built-in: $${builtin}`,
          documentation: {
            kind: MarkupKind.Markdown,
            value: `Built-in variable that resolves to the current ${builtin.toLowerCase()}`,
          },
          insertText: builtin,
          sortText: `1${builtin}`,
        })
      }
    }

    return items
  }

  /**
   * Get variable modifier completions
   */
  private getVariableModifierCompletions(): CompletionItem[] {
    return VARIABLE_MODIFIERS.map((mod, i) => ({
      label: mod.name,
      kind: CompletionItemKind.Property,
      detail: `Modifier: .${mod.name}`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: mod.description,
      },
      insertText: mod.name,
      sortText: String(i).padStart(2, '0'),
    }))
  }

  /**
   * Get JSON property completions for ACP config files
   */
  private getJsonPropertyCompletions(document: TextDocument, _params: CompletionParams): CompletionItem[] {
    const metadata = this.documentManager.getMetadata(document.uri)
    if (!metadata) {
      return []
    }

    // Provide completions based on file type
    if (metadata.isAcpConfig) {
      return this.getConfigPropertyCompletions()
    }
    if (metadata.isAcpVars) {
      return this.getVarsPropertyCompletions()
    }

    return []
  }

  /**
   * Get completions for .acp.config.json properties
   */
  private getConfigPropertyCompletions(): CompletionItem[] {
    return [
      {
        label: 'version',
        kind: CompletionItemKind.Property,
        detail: 'ACP config version',
        documentation: 'Semantic version of the ACP configuration format',
        insertText: '"version": "${1:1.0.0}"',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'include',
        kind: CompletionItemKind.Property,
        detail: 'Files to include',
        documentation: 'Glob patterns for files to include in ACP processing',
        insertText: '"include": [\n\t"${1:**/*}"\n]',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'exclude',
        kind: CompletionItemKind.Property,
        detail: 'Files to exclude',
        documentation: 'Glob patterns for files to exclude from ACP processing',
        insertText: '"exclude": [\n\t"${1:node_modules/**}"\n]',
        insertTextFormat: InsertTextFormat.Snippet,
      },
    ]
  }

  /**
   * Get completions for .acp.vars.json properties
   */
  private getVarsPropertyCompletions(): CompletionItem[] {
    return [
      {
        label: 'variables',
        kind: CompletionItemKind.Property,
        detail: 'Variable definitions',
        documentation: 'Define variables that can be referenced in annotations',
        insertText: '"variables": {\n\t"${1:name}": "${2:value}"\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
    ]
  }
}

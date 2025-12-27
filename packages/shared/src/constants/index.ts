/**
 * @acp:category("constants")
 * @acp:agent-instructions("Constants used across the ACP Language Server")
 */

/**
 * ACP annotation prefix pattern
 */
export const ACP_ANNOTATION_PREFIX = '@acp:'

/**
 * Known ACP annotation types (all namespaces)
 * File-level: purpose, module, domain, owner, layer, stability, ref
 * Symbol-level: fn, class, method, param, returns, throws, example, deprecated
 * Constraint: lock, lock-reason, style, behavior, quality, test
 * Inline: critical, todo, fixme, perf, hack, debug
 * Legacy: category, agent-instructions, constraint, context, exclude, include, priority, see-also, version
 */
export const ACP_ANNOTATION_TYPES = [
  // File-level annotations
  'purpose',
  'module',
  'domain',
  'owner',
  'layer',
  'stability',
  'ref',
  // Symbol-level annotations
  'fn',
  'class',
  'method',
  'param',
  'returns',
  'throws',
  'example',
  'deprecated',
  // Constraint annotations
  'lock',
  'lock-reason',
  'style',
  'behavior',
  'quality',
  'test',
  // Inline annotations
  'critical',
  'todo',
  'fixme',
  'perf',
  'hack',
  'debug',
  // Legacy/additional annotations
  'category',
  'agent-instructions',
  'constraint',
  'context',
  'exclude',
  'include',
  'priority',
  'see-also',
  'version',
] as const

export type ACPAnnotationType = (typeof ACP_ANNOTATION_TYPES)[number]

/**
 * File extensions by language
 */
export const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py', '.pyi'],
  rust: ['.rs'],
  go: ['.go'],
  java: ['.java'],
  csharp: ['.cs'],
  cpp: ['.cpp', '.hpp', '.cc', '.hh', '.c', '.h'],
}

/**
 * ACP configuration file names
 */
export const ACP_CONFIG_FILES = ['.acp.config.json', 'acp.config.json']

/**
 * ACP cache file name
 */
export const ACP_CACHE_FILE = '.acp.cache.json'

/**
 * Language server name for identification
 */
export const SERVER_NAME = 'acp-lsp'

/**
 * Language server version
 */
export const SERVER_VERSION = '0.1.0'
/**
 * @acp:category("utilities")
 * @acp:agent-instructions("Utility functions for ACP Language Server")
 */

import { LANGUAGE_EXTENSIONS, ACP_ANNOTATION_PREFIX } from '../constants/index.js'
import type { SupportedLanguage } from '../types/index.js'

/**
 * Get the language identifier from a file extension
 */
export function getLanguageFromExtension(filePath: string): SupportedLanguage | null {
  const ext = filePath.slice(filePath.lastIndexOf('.'))
  for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return language as SupportedLanguage
    }
  }
  return null
}

/**
 * Check if a string contains an ACP annotation
 */
export function containsACPAnnotation(text: string): boolean {
  return text.includes(ACP_ANNOTATION_PREFIX)
}

/**
 * Extract the annotation type from an ACP annotation string
 */
export function extractAnnotationType(annotation: string): string | null {
  const match = annotation.match(/@acp:([a-z-]+)\s*\(/)
  return match ? match[1] : null
}

/**
 * Parse a quoted string value, handling escapes
 */
export function parseQuotedValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  return value
}

/**
 * Check if a file path matches any of the glob patterns
 */
export function matchesGlob(filePath: string, patterns: string[]): boolean {
  // Basic implementation - for production, use a proper glob library
  for (const pattern of patterns) {
    if (pattern.startsWith('**/')) {
      const suffix = pattern.slice(3)
      if (filePath.endsWith(suffix) || filePath.includes('/' + suffix)) {
        return true
      }
    } else if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3)
      if (filePath.startsWith(prefix)) {
        return true
      }
    } else if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      if (regex.test(filePath)) {
        return true
      }
    } else if (filePath === pattern) {
      return true
    }
  }
  return false
}
/**
 * @acp:category("module")
 * @acp:agent-instructions("Parser module exports - provides annotation parsing for all supported languages")
 */

// Core types
export * from './types.js'

// Base parser
export { AnnotationParser } from './base.js'

// Language-specific parsers
export { TypeScriptAnnotationParser, createTypeScriptParser } from './typescript.js'

// Factory function
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { TypeScriptAnnotationParser } from './typescript.js'
import { AnnotationParser } from './base.js'
import type { SupportedLanguage } from '@acp-lsp/shared'
import { getLanguageFromExtension } from '@acp-lsp/shared'

/**
 * Create an annotation parser for the given document
 * Automatically detects language from file extension
 */
export function createParser(document: TextDocument): AnnotationParser | null {
  const uri = document.uri
  const language = getLanguageFromPath(uri)

  if (!language) {
    return null
  }

  return createParserForLanguage(document, language)
}

/**
 * Create an annotation parser for a specific language
 */
export function createParserForLanguage(
  document: TextDocument,
  language: SupportedLanguage
): AnnotationParser | null {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return new TypeScriptAnnotationParser(document)

    // Future language support:
    // case 'python':
    //   return new PythonAnnotationParser(document)
    // case 'rust':
    //   return new RustAnnotationParser(document)
    // case 'go':
    //   return new GoAnnotationParser(document)
    // case 'java':
    //   return new JavaAnnotationParser(document)
    // case 'csharp':
    //   return new CSharpAnnotationParser(document)
    // case 'cpp':
    //   return new CppAnnotationParser(document)

    default:
      return null
  }
}

/**
 * Get language from URI path
 */
function getLanguageFromPath(uri: string): SupportedLanguage | null {
  // Extract file path from URI
  let filePath = uri
  if (uri.startsWith('file://')) {
    filePath = decodeURIComponent(uri.slice(7))
  }

  return getLanguageFromExtension(filePath)
}

/**
 * Check if a language is supported for parsing
 */
export function isLanguageSupported(language: SupportedLanguage): boolean {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return true
    default:
      return false
  }
}
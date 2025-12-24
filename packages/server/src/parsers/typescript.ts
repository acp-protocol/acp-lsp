/**
 * @acp:category("parser")
 * @acp:agent-instructions("TypeScript/JavaScript annotation parser - handles line, block, and doc comment styles")
 */

import type { TextDocument } from 'vscode-languageserver-textdocument'
import { AnnotationParser } from './base.js'
import type { ParsedComment, ParseResult, ParsedAnnotation, AnnotationDiagnostic } from './types.js'

/**
 * Comment patterns for TypeScript/JavaScript
 */
const PATTERNS = {
  // Single-line comment: // ...
  LINE_COMMENT: /\/\/(.*)$/gm,

  // Block comment: /* ... */
  BLOCK_COMMENT: /\/\*([^*]|\*(?!\/))*\*\//gs,

  // Doc comment: /** ... */
  DOC_COMMENT: /\/\*\*([^*]|\*(?!\/))*\*\//gs,
}

/**
 * TypeScript/JavaScript annotation parser
 * Handles three comment styles:
 * - Single-line: // @acp:...
 * - Block: multi-line block comments
 * - Doc: JSDoc-style documentation comments
 */
export class TypeScriptAnnotationParser extends AnnotationParser {
  constructor(document: TextDocument) {
    super(document)
  }

  /**
   * Parse the document and extract all annotations
   */
  parse(): ParseResult {
    const comments = this.extractComments()
    const annotations: ParsedAnnotation[] = []
    const documentDiagnostics: AnnotationDiagnostic[] = []

    for (const comment of comments) {
      const parsed = this.parseAnnotationsFromComment(comment)
      annotations.push(...parsed)
    }

    // Collect all diagnostics
    for (const annotation of annotations) {
      documentDiagnostics.push(...annotation.diagnostics)
    }

    return {
      annotations,
      comments,
      diagnostics: documentDiagnostics,
    }
  }

  /**
   * Extract all comments from the document
   */
  protected extractComments(): ParsedComment[] {
    const text = this.document.getText()
    const comments: ParsedComment[] = []

    // Track positions to avoid duplicates (doc comments are also block comments)
    const processedRanges = new Set<string>()

    // Extract doc comments first (/** ... */)
    this.extractDocComments(text, comments, processedRanges)

    // Extract block comments (/* ... */)
    this.extractBlockComments(text, comments, processedRanges)

    // Extract line comments (// ...)
    this.extractLineComments(text, comments, processedRanges)

    // Sort by start position
    comments.sort((a, b) => a.startOffset - b.startOffset)

    return comments
  }

  /**
   * Extract doc comments (JSDoc style)
   */
  private extractDocComments(text: string, comments: ParsedComment[], processedRanges: Set<string>): void {
    const pattern = new RegExp(PATTERNS.DOC_COMMENT.source, 'gs')
    let match: RegExpExecArray | null

    while ((match = pattern.exec(text)) !== null) {
      const startOffset = match.index
      const endOffset = match.index + match[0].length
      const rangeKey = `${startOffset}-${endOffset}`

      if (processedRanges.has(rangeKey)) {
        continue
      }
      processedRanges.add(rangeKey)

      // Remove /** and */ and clean up content
      const content = this.cleanDocComment(match[0])

      comments.push({
        type: 'doc',
        content,
        range: this.createRange(startOffset, endOffset),
        startOffset,
        endOffset,
      })
    }
  }

  /**
   * Extract block comments (multi-line style)
   */
  private extractBlockComments(text: string, comments: ParsedComment[], processedRanges: Set<string>): void {
    const pattern = new RegExp(PATTERNS.BLOCK_COMMENT.source, 'gs')
    let match: RegExpExecArray | null

    while ((match = pattern.exec(text)) !== null) {
      const startOffset = match.index
      const endOffset = match.index + match[0].length
      const rangeKey = `${startOffset}-${endOffset}`

      if (processedRanges.has(rangeKey)) {
        continue
      }
      processedRanges.add(rangeKey)

      // Skip if it's a doc comment (starts with /**)
      if (match[0].startsWith('/**')) {
        continue
      }

      // Remove /* and */ and clean up content
      const content = this.cleanBlockComment(match[0])

      comments.push({
        type: 'block',
        content,
        range: this.createRange(startOffset, endOffset),
        startOffset,
        endOffset,
      })
    }
  }

  /**
   * Extract line comments (// ...)
   */
  private extractLineComments(text: string, comments: ParsedComment[], processedRanges: Set<string>): void {
    const pattern = new RegExp(PATTERNS.LINE_COMMENT.source, 'gm')
    let match: RegExpExecArray | null

    while ((match = pattern.exec(text)) !== null) {
      const startOffset = match.index
      const endOffset = match.index + match[0].length
      const rangeKey = `${startOffset}-${endOffset}`

      if (processedRanges.has(rangeKey)) {
        continue
      }
      processedRanges.add(rangeKey)

      // Content is everything after //
      const content = match[1].trim()

      comments.push({
        type: 'line',
        content,
        range: this.createRange(startOffset, endOffset),
        startOffset,
        endOffset,
      })
    }
  }

  /**
   * Clean a doc comment by removing delimiters and asterisks
   */
  private cleanDocComment(comment: string): string {
    // Remove /** and */
    let content = comment.slice(3, -2)

    // Remove leading asterisks from each line
    content = content
      .split('\n')
      .map((line) => {
        // Remove leading whitespace and asterisk
        return line.replace(/^\s*\*\s?/, '')
      })
      .join('\n')
      .trim()

    return content
  }

  /**
   * Clean a block comment by removing delimiters
   */
  private cleanBlockComment(comment: string): string {
    // Remove /* and */
    return comment.slice(2, -2).trim()
  }

  /**
   * Parse annotations from a single comment
   */
  private parseAnnotationsFromComment(comment: ParsedComment): ParsedAnnotation[] {
    const annotations: ParsedAnnotation[] = []
    const content = comment.content

    // For doc comments, handle multiple annotations (one per line potentially)
    if (comment.type === 'doc') {
      const lines = content.split('\n')
      let currentOffset = comment.startOffset + 3 // Skip /**

      for (const line of lines) {
        if (line.includes('@acp:')) {
          const annotation = this.parseAnnotation(line, comment.range, currentOffset)
          if (annotation) {
            annotations.push(annotation)
          }
        }
        currentOffset += line.length + 1 // +1 for newline
      }
    } else {
      // For line and block comments, parse as single annotation
      if (content.includes('@acp:')) {
        const baseOffset = comment.type === 'line' ? comment.startOffset + 2 : comment.startOffset + 2
        const annotation = this.parseAnnotation(content, comment.range, baseOffset)
        if (annotation) {
          annotations.push(annotation)
        }
      }
    }

    return annotations
  }
}

/**
 * Create a TypeScript parser for the given document
 */
export function createTypeScriptParser(document: TextDocument): TypeScriptAnnotationParser {
  return new TypeScriptAnnotationParser(document)
}
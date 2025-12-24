/**
 * @acp:category("service")
 * @acp:agent-instructions("Document manager that wraps TextDocuments and provides additional document-related functionality including comment patterns and ACP file detection")
 */

import type { TextDocuments } from 'vscode-languageserver'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { Logger } from '../utils/logger.js'
import { getLanguageFromExtension, containsACPAnnotation } from '@acp-lsp/shared'
import type { SupportedLanguage, ACPAnnotation } from '@acp-lsp/shared'

/**
 * Comment patterns for a programming language
 */
export interface CommentPatterns {
  /** Single-line comment prefix (e.g., '//' or '#') */
  line: string
  /** Block comment start (e.g., '/*') */
  blockStart: string
  /** Block comment end (e.g., '*\/') */
  blockEnd: string
  /** Documentation comment start (optional, e.g., '/**' or '///') */
  docStart?: string
  /** Documentation comment end (optional) */
  docEnd?: string
}

/**
 * Metadata about an open document
 */
export interface DocumentMetadata {
  /** The document URI */
  uri: string
  /** The detected language */
  language: SupportedLanguage | null
  /** Whether the document contains ACP annotations */
  hasAnnotations: boolean
  /** Whether this is an ACP config file (.acp.config.json) */
  isAcpConfig: boolean
  /** Whether this is an ACP cache file (.acp.cache.json) */
  isAcpCache: boolean
  /** Whether this is an ACP vars file (.acp.vars.json) */
  isAcpVars: boolean
  /** Document version */
  version: number
  /** Cached annotations (if parsed) */
  annotations?: ACPAnnotation[]
  /** Last parse timestamp */
  lastParsed?: number
  /** Document version at last parse */
  lastParsedVersion?: number
  /** Last validation timestamp */
  lastValidated?: number
}

/**
 * Document manager that wraps TextDocuments and provides
 * additional functionality for ACP annotation tracking
 */
export class DocumentManager {
  private documents: TextDocuments<TextDocument>
  private logger: Logger
  private metadata: Map<string, DocumentMetadata> = new Map()

  /**
   * Language-specific comment patterns for annotation parsing
   */
  private static readonly COMMENT_PATTERNS: Record<string, CommentPatterns> = {
    typescript: { line: '//', blockStart: '/*', blockEnd: '*/', docStart: '/**', docEnd: '*/' },
    javascript: { line: '//', blockStart: '/*', blockEnd: '*/', docStart: '/**', docEnd: '*/' },
    typescriptreact: { line: '//', blockStart: '/*', blockEnd: '*/', docStart: '/**', docEnd: '*/' },
    javascriptreact: { line: '//', blockStart: '/*', blockEnd: '*/', docStart: '/**', docEnd: '*/' },
    python: { line: '#', blockStart: '"""', blockEnd: '"""', docStart: "'''", docEnd: "'''" },
    rust: { line: '//', blockStart: '/*', blockEnd: '*/', docStart: '///', docEnd: '' },
    go: { line: '//', blockStart: '/*', blockEnd: '*/' },
    java: { line: '//', blockStart: '/*', blockEnd: '*/', docStart: '/**', docEnd: '*/' },
    csharp: { line: '//', blockStart: '/*', blockEnd: '*/', docStart: '///', docEnd: '' },
    cpp: { line: '//', blockStart: '/*', blockEnd: '*/' },
    c: { line: '//', blockStart: '/*', blockEnd: '*/' },
  }

  constructor(documents: TextDocuments<TextDocument>, logger: Logger) {
    this.documents = documents
    this.logger = logger
  }

  /**
   * Get a document by URI
   */
  get(uri: string): TextDocument | undefined {
    return this.documents.get(uri)
  }

  /**
   * Get all open documents
   */
  all(): TextDocument[] {
    return this.documents.all()
  }

  /**
   * Get metadata for a document
   */
  getMetadata(uri: string): DocumentMetadata | undefined {
    return this.metadata.get(uri)
  }

  /**
   * Update metadata for a document
   */
  updateMetadata(uri: string, update: Partial<DocumentMetadata>): void {
    const existing = this.metadata.get(uri)
    if (existing) {
      this.metadata.set(uri, { ...existing, ...update })
    }
  }

  /**
   * Initialize metadata for a newly opened document
   */
  initializeDocument(document: TextDocument): DocumentMetadata {
    const uri = document.uri
    const text = document.getText()

    // Extract file path from URI for language detection
    const filePath = this.uriToPath(uri)
    const filename = filePath.split('/').pop() || ''
    const language = getLanguageFromExtension(filePath)
    const hasAnnotations = containsACPAnnotation(text)

    // Detect ACP JSON file types
    const isAcpConfig = /\.?acp\.config\.json$/.test(filename)
    const isAcpCache = /\.?acp\.cache\.json$/.test(filename)
    const isAcpVars = /\.?acp\.vars\.json$/.test(filename)

    const metadata: DocumentMetadata = {
      uri,
      language,
      hasAnnotations,
      isAcpConfig,
      isAcpCache,
      isAcpVars,
      version: document.version,
    }

    this.metadata.set(uri, metadata)
    this.logger.debug(`Initialized document: ${uri}`, {
      language,
      hasAnnotations,
      isAcpConfig,
      isAcpCache,
      isAcpVars,
    })

    return metadata
  }

  /**
   * Handle document content change
   */
  onDocumentChange(document: TextDocument): void {
    const uri = document.uri
    const text = document.getText()
    const hasAnnotations = containsACPAnnotation(text)

    const existing = this.metadata.get(uri)
    if (existing) {
      // Clear cached annotations on change
      this.metadata.set(uri, {
        ...existing,
        hasAnnotations,
        annotations: undefined,
        lastParsed: undefined,
        lastParsedVersion: undefined,
      })
    } else {
      this.initializeDocument(document)
    }
  }

  /**
   * Handle document close
   */
  onDocumentClose(uri: string): void {
    this.metadata.delete(uri)
    this.logger.debug(`Closed document: ${uri}`)
  }

  /**
   * Check if a document is an ACP-relevant file
   */
  isACPRelevant(uri: string): boolean {
    const metadata = this.metadata.get(uri)
    if (!metadata) {
      return false
    }
    // Document is relevant if it's a supported language and has annotations
    // or if we haven't fully parsed it yet
    return metadata.language !== null
  }

  /**
   * Get all documents that have ACP annotations
   */
  getAnnotatedDocuments(): TextDocument[] {
    return this.documents.all().filter((doc) => {
      const metadata = this.metadata.get(doc.uri)
      return metadata?.hasAnnotations ?? false
    })
  }

  /**
   * Store parsed annotations for a document
   */
  setCachedAnnotations(uri: string, annotations: ACPAnnotation[], version: number): void {
    const metadata = this.metadata.get(uri)
    if (metadata) {
      this.metadata.set(uri, {
        ...metadata,
        annotations,
        lastParsed: Date.now(),
        lastParsedVersion: version,
      })
    }
  }

  /**
   * Get cached annotations if they're still valid for the current version
   */
  getCachedAnnotations(uri: string, currentVersion: number): ACPAnnotation[] | undefined {
    const metadata = this.metadata.get(uri)
    if (metadata?.annotations && metadata.lastParsedVersion === currentVersion) {
      return metadata.annotations
    }
    return undefined
  }

  /**
   * Convert a file URI to a file path
   */
  private uriToPath(uri: string): string {
    // Handle file:// URIs
    if (uri.startsWith('file://')) {
      return decodeURIComponent(uri.slice(7))
    }
    return uri
  }

  /**
   * Get comment patterns for a language
   * Falls back to TypeScript-style comments for unknown languages
   */
  getCommentPatterns(languageId: string): CommentPatterns {
    return DocumentManager.COMMENT_PATTERNS[languageId] || DocumentManager.COMMENT_PATTERNS.typescript
  }

  /**
   * Check if a language supports ACP annotations
   */
  isAnnotationSupported(languageId: string): boolean {
    return languageId in DocumentManager.COMMENT_PATTERNS
  }

  /**
   * Get all ACP JSON configuration documents (config, cache, vars)
   */
  getAcpJsonDocuments(): TextDocument[] {
    return this.documents.all().filter((doc) => {
      const metadata = this.metadata.get(doc.uri)
      return metadata && (metadata.isAcpConfig || metadata.isAcpCache || metadata.isAcpVars)
    })
  }

  /**
   * Check if document needs revalidation (version changed since last validation)
   */
  needsRevalidation(document: TextDocument): boolean {
    const metadata = this.metadata.get(document.uri)
    return !metadata || metadata.version !== document.version
  }

  /**
   * Update last validated timestamp for a document
   */
  markValidated(uri: string): void {
    const metadata = this.metadata.get(uri)
    if (metadata) {
      this.metadata.set(uri, {
        ...metadata,
        lastValidated: Date.now(),
      })
    }
  }
}
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { TextDocuments } from 'vscode-languageserver'
import { DocumentManager } from '../../src/documents/manager.js'
import { DocumentSyncHandler, DEFAULT_SYNC_OPTIONS } from '../../src/documents/sync.js'
import { Logger } from '../../src/utils/logger.js'

/**
 * Mock Logger for testing
 */
function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  } as unknown as Logger
}

/**
 * Mock TextDocuments for testing
 */
function createMockTextDocuments(docs: TextDocument[] = []): TextDocuments<TextDocument> {
  const docMap = new Map<string, TextDocument>()
  for (const doc of docs) {
    docMap.set(doc.uri, doc)
  }

  return {
    get: (uri: string) => docMap.get(uri),
    all: () => Array.from(docMap.values()),
    keys: () => Array.from(docMap.keys()),
    onDidOpen: vi.fn(),
    onDidChangeContent: vi.fn(),
    onDidClose: vi.fn(),
    onDidSave: vi.fn(),
    onWillSave: vi.fn(),
    onWillSaveWaitUntil: vi.fn(),
    listen: vi.fn(),
  } as unknown as TextDocuments<TextDocument>
}

/**
 * Helper to create a TextDocument from content
 */
function createDocument(
  content: string,
  uri: string = 'file:///test.ts',
  version: number = 1
): TextDocument {
  return TextDocument.create(uri, 'typescript', version, content)
}

describe('DocumentManager', () => {
  let logger: Logger
  let textDocuments: TextDocuments<TextDocument>
  let documentManager: DocumentManager

  beforeEach(() => {
    logger = createMockLogger()
    textDocuments = createMockTextDocuments()
    documentManager = new DocumentManager(textDocuments, logger)
  })

  describe('Document access', () => {
    it('should get document by URI', () => {
      const doc = createDocument('// content', 'file:///test.ts')
      textDocuments = createMockTextDocuments([doc])
      documentManager = new DocumentManager(textDocuments, logger)

      expect(documentManager.get('file:///test.ts')).toBe(doc)
      expect(documentManager.get('file:///nonexistent.ts')).toBeUndefined()
    })

    it('should get all documents', () => {
      const doc1 = createDocument('// one', 'file:///one.ts')
      const doc2 = createDocument('// two', 'file:///two.ts')
      textDocuments = createMockTextDocuments([doc1, doc2])
      documentManager = new DocumentManager(textDocuments, logger)

      const all = documentManager.all()
      expect(all).toHaveLength(2)
      expect(all).toContain(doc1)
      expect(all).toContain(doc2)
    })
  })

  describe('Document initialization', () => {
    it('should initialize document metadata with language detection', () => {
      const doc = createDocument('// @acp:fn("test")', 'file:///test.ts')
      const metadata = documentManager.initializeDocument(doc)

      expect(metadata.uri).toBe('file:///test.ts')
      expect(metadata.language).toBe('typescript')
      expect(metadata.hasAnnotations).toBe(true)
      expect(metadata.version).toBe(1)
    })

    it('should detect ACP config file', () => {
      const doc = createDocument('{}', 'file:///project/.acp.config.json')
      const metadata = documentManager.initializeDocument(doc)

      expect(metadata.isAcpConfig).toBe(true)
      expect(metadata.isAcpCache).toBe(false)
      expect(metadata.isAcpVars).toBe(false)
    })

    it('should detect ACP cache file', () => {
      const doc = createDocument('{}', 'file:///project/.acp.cache.json')
      const metadata = documentManager.initializeDocument(doc)

      expect(metadata.isAcpConfig).toBe(false)
      expect(metadata.isAcpCache).toBe(true)
      expect(metadata.isAcpVars).toBe(false)
    })

    it('should detect ACP vars file', () => {
      const doc = createDocument('{}', 'file:///project/.acp.vars.json')
      const metadata = documentManager.initializeDocument(doc)

      expect(metadata.isAcpConfig).toBe(false)
      expect(metadata.isAcpCache).toBe(false)
      expect(metadata.isAcpVars).toBe(true)
    })

    it('should detect document without annotations', () => {
      const doc = createDocument('// just a comment', 'file:///test.ts')
      const metadata = documentManager.initializeDocument(doc)

      expect(metadata.hasAnnotations).toBe(false)
    })

    it('should detect Python language', () => {
      const doc = createDocument('# @acp:fn("test")', 'file:///test.py')
      const metadata = documentManager.initializeDocument(doc)

      expect(metadata.language).toBe('python')
    })

    it('should detect JavaScript language', () => {
      const doc = createDocument('// code', 'file:///test.js')
      const metadata = documentManager.initializeDocument(doc)

      expect(metadata.language).toBe('javascript')
    })
  })

  describe('Document changes', () => {
    it('should update metadata on document change', () => {
      const doc = createDocument('// no annotations', 'file:///test.ts')
      documentManager.initializeDocument(doc)

      // Simulate document change with annotation
      const updatedDoc = createDocument('// @acp:fn("test")', 'file:///test.ts', 2)
      documentManager.onDocumentChange(updatedDoc)

      const metadata = documentManager.getMetadata('file:///test.ts')
      expect(metadata?.hasAnnotations).toBe(true)
    })

    it('should clear cached annotations on change', () => {
      const doc = createDocument('// @acp:fn("test")', 'file:///test.ts')
      documentManager.initializeDocument(doc)

      // Cache some annotations
      documentManager.setCachedAnnotations(
        'file:///test.ts',
        [{ type: 'fn', value: 'test', location: {} as never, raw: '' }],
        1
      )

      // Change document
      const updatedDoc = createDocument('// @acp:fn("updated")', 'file:///test.ts', 2)
      documentManager.onDocumentChange(updatedDoc)

      // Cached annotations should be cleared
      expect(documentManager.getCachedAnnotations('file:///test.ts', 2)).toBeUndefined()
    })

    it('should initialize document on change if not tracked', () => {
      const doc = createDocument('// @acp:fn("test")', 'file:///new.ts')
      documentManager.onDocumentChange(doc)

      const metadata = documentManager.getMetadata('file:///new.ts')
      expect(metadata).toBeDefined()
      expect(metadata?.hasAnnotations).toBe(true)
    })
  })

  describe('Document close', () => {
    it('should remove metadata on close', () => {
      const doc = createDocument('// content', 'file:///test.ts')
      documentManager.initializeDocument(doc)

      expect(documentManager.getMetadata('file:///test.ts')).toBeDefined()

      documentManager.onDocumentClose('file:///test.ts')

      expect(documentManager.getMetadata('file:///test.ts')).toBeUndefined()
    })
  })

  describe('Comment patterns', () => {
    it('should return TypeScript comment patterns', () => {
      const patterns = documentManager.getCommentPatterns('typescript')

      expect(patterns.line).toBe('//')
      expect(patterns.blockStart).toBe('/*')
      expect(patterns.blockEnd).toBe('*/')
      expect(patterns.docStart).toBe('/**')
    })

    it('should return Python comment patterns', () => {
      const patterns = documentManager.getCommentPatterns('python')

      expect(patterns.line).toBe('#')
      expect(patterns.blockStart).toBe('"""')
      expect(patterns.blockEnd).toBe('"""')
    })

    it('should return Rust comment patterns with doc comments', () => {
      const patterns = documentManager.getCommentPatterns('rust')

      expect(patterns.line).toBe('//')
      expect(patterns.docStart).toBe('///')
    })

    it('should return C# comment patterns with doc comments', () => {
      const patterns = documentManager.getCommentPatterns('csharp')

      expect(patterns.line).toBe('//')
      expect(patterns.docStart).toBe('///')
    })

    it('should fall back to TypeScript patterns for unknown language', () => {
      const patterns = documentManager.getCommentPatterns('unknown')

      expect(patterns.line).toBe('//')
      expect(patterns.blockStart).toBe('/*')
    })
  })

  describe('Annotation support detection', () => {
    it('should detect supported languages', () => {
      expect(documentManager.isAnnotationSupported('typescript')).toBe(true)
      expect(documentManager.isAnnotationSupported('javascript')).toBe(true)
      expect(documentManager.isAnnotationSupported('python')).toBe(true)
      expect(documentManager.isAnnotationSupported('rust')).toBe(true)
      expect(documentManager.isAnnotationSupported('go')).toBe(true)
      expect(documentManager.isAnnotationSupported('java')).toBe(true)
      expect(documentManager.isAnnotationSupported('csharp')).toBe(true)
      expect(documentManager.isAnnotationSupported('cpp')).toBe(true)
      expect(documentManager.isAnnotationSupported('c')).toBe(true)
    })

    it('should detect unsupported languages', () => {
      expect(documentManager.isAnnotationSupported('haskell')).toBe(false)
      expect(documentManager.isAnnotationSupported('unknown')).toBe(false)
    })
  })

  describe('Annotated documents', () => {
    it('should filter documents with annotations', () => {
      const doc1 = createDocument('// @acp:fn("test")', 'file:///with-annotations.ts')
      const doc2 = createDocument('// no annotations', 'file:///without.ts')
      textDocuments = createMockTextDocuments([doc1, doc2])
      documentManager = new DocumentManager(textDocuments, logger)

      documentManager.initializeDocument(doc1)
      documentManager.initializeDocument(doc2)

      const annotated = documentManager.getAnnotatedDocuments()
      expect(annotated).toHaveLength(1)
      expect(annotated[0]).toBe(doc1)
    })
  })

  describe('ACP JSON documents', () => {
    it('should filter ACP JSON documents', () => {
      const config = createDocument('{}', 'file:///project/.acp.config.json')
      const cache = createDocument('{}', 'file:///project/.acp.cache.json')
      const vars = createDocument('{}', 'file:///project/.acp.vars.json')
      const regular = createDocument('{}', 'file:///project/package.json')

      textDocuments = createMockTextDocuments([config, cache, vars, regular])
      documentManager = new DocumentManager(textDocuments, logger)

      documentManager.initializeDocument(config)
      documentManager.initializeDocument(cache)
      documentManager.initializeDocument(vars)
      documentManager.initializeDocument(regular)

      const acpDocs = documentManager.getAcpJsonDocuments()
      expect(acpDocs).toHaveLength(3)
      expect(acpDocs).toContain(config)
      expect(acpDocs).toContain(cache)
      expect(acpDocs).toContain(vars)
      expect(acpDocs).not.toContain(regular)
    })
  })

  describe('Annotation caching', () => {
    it('should cache annotations with version', () => {
      const doc = createDocument('// @acp:fn("test")', 'file:///test.ts')
      documentManager.initializeDocument(doc)

      const annotations = [{ type: 'fn', value: 'test', location: {} as never, raw: '' }]
      documentManager.setCachedAnnotations('file:///test.ts', annotations, 1)

      expect(documentManager.getCachedAnnotations('file:///test.ts', 1)).toEqual(annotations)
    })

    it('should not return cached annotations for different version', () => {
      const doc = createDocument('// @acp:fn("test")', 'file:///test.ts')
      documentManager.initializeDocument(doc)

      const annotations = [{ type: 'fn', value: 'test', location: {} as never, raw: '' }]
      documentManager.setCachedAnnotations('file:///test.ts', annotations, 1)

      expect(documentManager.getCachedAnnotations('file:///test.ts', 2)).toBeUndefined()
    })
  })

  describe('Revalidation check', () => {
    it('should indicate revalidation needed for unknown document', () => {
      const doc = createDocument('// content', 'file:///unknown.ts')
      expect(documentManager.needsRevalidation(doc)).toBe(true)
    })

    it('should indicate revalidation needed when version changes', () => {
      const doc = createDocument('// content', 'file:///test.ts')
      documentManager.initializeDocument(doc)

      const updatedDoc = createDocument('// updated', 'file:///test.ts', 2)
      expect(documentManager.needsRevalidation(updatedDoc)).toBe(true)
    })

    it('should not indicate revalidation when version is same', () => {
      const doc = createDocument('// content', 'file:///test.ts')
      documentManager.initializeDocument(doc)

      expect(documentManager.needsRevalidation(doc)).toBe(false)
    })
  })

  describe('Mark validated', () => {
    it('should update lastValidated timestamp', () => {
      const doc = createDocument('// content', 'file:///test.ts')
      documentManager.initializeDocument(doc)

      const beforeValidation = documentManager.getMetadata('file:///test.ts')?.lastValidated
      expect(beforeValidation).toBeUndefined()

      documentManager.markValidated('file:///test.ts')

      const afterValidation = documentManager.getMetadata('file:///test.ts')?.lastValidated
      expect(afterValidation).toBeDefined()
      expect(typeof afterValidation).toBe('number')
    })
  })
})

describe('DocumentSyncHandler', () => {
  let logger: Logger
  let textDocuments: TextDocuments<TextDocument>
  let documentManager: DocumentManager
  let validateMock: ReturnType<typeof vi.fn>
  let syncHandler: DocumentSyncHandler

  beforeEach(() => {
    logger = createMockLogger()
    textDocuments = createMockTextDocuments()
    documentManager = new DocumentManager(textDocuments, logger)
    validateMock = vi.fn()
    syncHandler = new DocumentSyncHandler(documentManager, validateMock, logger)
  })

  describe('Static methods', () => {
    it('should return correct sync options', () => {
      const options = DocumentSyncHandler.getSyncOptions()

      expect(options.openClose).toBe(true)
      expect(options.change).toBe(2) // TextDocumentSyncKind.Incremental
      expect(options.save).toEqual({ includeText: true })
    })
  })

  describe('Default options', () => {
    it('should have correct default options', () => {
      expect(DEFAULT_SYNC_OPTIONS.validationDebounceMs).toBe(300)
      expect(DEFAULT_SYNC_OPTIONS.validateOnSave).toBe(true)
      expect(DEFAULT_SYNC_OPTIONS.validateOnOpen).toBe(true)
    })
  })

  describe('Handle open', () => {
    it('should initialize document and schedule validation', async () => {
      const doc = createDocument('// @acp:fn("test")', 'file:///test.ts')
      textDocuments = createMockTextDocuments([doc])
      documentManager = new DocumentManager(textDocuments, logger)
      syncHandler = new DocumentSyncHandler(documentManager, validateMock, logger)

      syncHandler.handleOpen(doc)

      expect(documentManager.getMetadata('file:///test.ts')).toBeDefined()
      expect(syncHandler.pendingCount).toBe(1)

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 350))

      expect(validateMock).toHaveBeenCalledWith(doc)
    })

    it('should not validate on open if disabled', async () => {
      const doc = createDocument('// content', 'file:///test.ts')
      syncHandler = new DocumentSyncHandler(documentManager, validateMock, logger, {
        validateOnOpen: false,
      })

      syncHandler.handleOpen(doc)

      await new Promise((resolve) => setTimeout(resolve, 350))
      expect(validateMock).not.toHaveBeenCalled()
    })
  })

  describe('Handle change', () => {
    it('should update metadata and schedule validation', async () => {
      const doc = createDocument('// @acp:fn("test")', 'file:///test.ts')
      textDocuments = createMockTextDocuments([doc])
      documentManager = new DocumentManager(textDocuments, logger)
      syncHandler = new DocumentSyncHandler(documentManager, validateMock, logger)

      documentManager.initializeDocument(doc)
      syncHandler.handleChange(doc)

      expect(syncHandler.pendingCount).toBe(1)

      await new Promise((resolve) => setTimeout(resolve, 350))
      expect(validateMock).toHaveBeenCalled()
    })

    it('should debounce rapid changes', async () => {
      const doc = createDocument('// content', 'file:///test.ts')
      textDocuments = createMockTextDocuments([doc])
      documentManager = new DocumentManager(textDocuments, logger)
      syncHandler = new DocumentSyncHandler(documentManager, validateMock, logger, {
        validationDebounceMs: 100,
      })

      documentManager.initializeDocument(doc)

      // Rapid changes
      syncHandler.handleChange(doc)
      syncHandler.handleChange(doc)
      syncHandler.handleChange(doc)

      expect(syncHandler.pendingCount).toBe(1) // Only one pending

      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(validateMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Handle save', () => {
    it('should validate immediately on save', () => {
      const doc = createDocument('// content', 'file:///test.ts')
      documentManager.initializeDocument(doc)

      syncHandler.handleSave(doc)

      expect(validateMock).toHaveBeenCalledWith(doc)
    })

    it('should cancel pending validation on save', async () => {
      const doc = createDocument('// content', 'file:///test.ts')
      textDocuments = createMockTextDocuments([doc])
      documentManager = new DocumentManager(textDocuments, logger)
      syncHandler = new DocumentSyncHandler(documentManager, validateMock, logger)

      documentManager.initializeDocument(doc)

      // Schedule validation via change
      syncHandler.handleChange(doc)
      expect(syncHandler.pendingCount).toBe(1)

      // Save should cancel pending and validate immediately
      syncHandler.handleSave(doc)
      expect(syncHandler.pendingCount).toBe(0)
      expect(validateMock).toHaveBeenCalledTimes(1)
    })

    it('should not validate on save if disabled', () => {
      const doc = createDocument('// content', 'file:///test.ts')
      syncHandler = new DocumentSyncHandler(documentManager, validateMock, logger, {
        validateOnSave: false,
      })

      syncHandler.handleSave(doc)

      expect(validateMock).not.toHaveBeenCalled()
    })
  })

  describe('Handle close', () => {
    it('should cancel pending validation and clean up', () => {
      const doc = createDocument('// content', 'file:///test.ts')
      textDocuments = createMockTextDocuments([doc])
      documentManager = new DocumentManager(textDocuments, logger)
      syncHandler = new DocumentSyncHandler(documentManager, validateMock, logger)

      documentManager.initializeDocument(doc)
      syncHandler.handleChange(doc)

      expect(syncHandler.pendingCount).toBe(1)
      expect(documentManager.getMetadata('file:///test.ts')).toBeDefined()

      syncHandler.handleClose('file:///test.ts')

      expect(syncHandler.pendingCount).toBe(0)
      expect(documentManager.getMetadata('file:///test.ts')).toBeUndefined()
    })
  })

  describe('Cancel all', () => {
    it('should cancel all pending validations', async () => {
      const doc1 = createDocument('// one', 'file:///one.ts')
      const doc2 = createDocument('// two', 'file:///two.ts')
      textDocuments = createMockTextDocuments([doc1, doc2])
      documentManager = new DocumentManager(textDocuments, logger)
      syncHandler = new DocumentSyncHandler(documentManager, validateMock, logger)

      documentManager.initializeDocument(doc1)
      documentManager.initializeDocument(doc2)

      syncHandler.handleChange(doc1)
      syncHandler.handleChange(doc2)

      expect(syncHandler.pendingCount).toBe(2)

      syncHandler.cancelAll()

      expect(syncHandler.pendingCount).toBe(0)

      // Wait to ensure no validations fire
      await new Promise((resolve) => setTimeout(resolve, 350))
      expect(validateMock).not.toHaveBeenCalled()
    })
  })
})

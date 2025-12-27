/**
 * Integration test harness for ACP LSP server
 * Provides a simulated LSP environment for end-to-end testing
 */

import { vi } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import type {
  Connection,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionParams,
  HoverParams,
  Hover,
  CompletionItem,
  CompletionList,
  Diagnostic,
  PublishDiagnosticsParams,
} from 'vscode-languageserver'
import { TextDocuments } from 'vscode-languageserver'
import { DocumentManager } from '../../src/documents/manager.js'
import { DocumentSyncHandler } from '../../src/documents/sync.js'
import { ConfigurationStore } from '../../src/services/configuration.js'
import { DiagnosticsProvider } from '../../src/providers/diagnostics.js'
import { CompletionProvider } from '../../src/providers/completion.js'
import { HoverProvider } from '../../src/providers/hover.js'
import { Logger, LogLevel } from '../../src/utils/logger.js'
import { createCapabilities } from '../../src/capabilities.js'

/**
 * Published diagnostics storage
 */
export interface PublishedDiagnostics {
  uri: string
  diagnostics: Diagnostic[]
  timestamp: number
}

/**
 * Mock console for logger
 */
function createMockConsole() {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
  }
}

/**
 * Integration test harness that provides a complete LSP server environment
 */
export class TestHarness {
  // Core components
  public connection: Connection
  public documents: TextDocuments<TextDocument>
  public documentManager: DocumentManager
  public documentSyncHandler: DocumentSyncHandler
  public configStore: ConfigurationStore
  public diagnosticsProvider: DiagnosticsProvider
  public completionProvider: CompletionProvider
  public hoverProvider: HoverProvider
  public logger: Logger

  // Test state tracking
  public publishedDiagnostics: Map<string, PublishedDiagnostics> = new Map()
  private documentContents: Map<string, { content: string; version: number; languageId: string }> =
    new Map()
  private initialized = false

  // Event handlers captured from connection
  private handlers: {
    onInitialize?: (params: InitializeParams) => InitializeResult
    onInitialized?: () => void
    onCompletion?: (params: CompletionParams) => CompletionItem[] | CompletionList | null
    onCompletionResolve?: (item: CompletionItem) => CompletionItem
    onHover?: (params: HoverParams) => Hover | null
    onDidChangeConfiguration?: (change: { settings?: Record<string, unknown> }) => void
  } = {}

  // Document event handlers
  private documentHandlers: {
    onDidOpen?: (event: { document: TextDocument }) => void
    onDidChangeContent?: (change: { document: TextDocument }) => void
    onDidSave?: (event: { document: TextDocument }) => void
    onDidClose?: (event: { document: TextDocument }) => void
  } = {}

  constructor() {
    // Create mock connection
    this.connection = this.createMockConnection()

    // Create mock TextDocuments that tracks our document state
    this.documents = this.createMockTextDocuments()

    // Create logger
    const mockConsole = createMockConsole()
    this.logger = new Logger(mockConsole as unknown as Console, LogLevel.Debug)

    // Create core services
    this.documentManager = new DocumentManager(this.documents, this.logger)
    this.configStore = new ConfigurationStore(this.connection, false)
    this.diagnosticsProvider = new DiagnosticsProvider(
      this.connection,
      this.documentManager,
      this.logger
    )
    this.completionProvider = new CompletionProvider(this.documentManager, this.logger)
    this.hoverProvider = new HoverProvider(this.documentManager, this.logger)

    // Create document sync handler - use validateImmediate for test consistency
    this.documentSyncHandler = new DocumentSyncHandler(
      this.documentManager,
      (document) => this.diagnosticsProvider.validateImmediate(document),
      this.logger,
      { validationDebounceMs: 50, validateOnOpen: true, validateOnSave: true }
    )
  }

  /**
   * Create a mock LSP connection
   */
  private createMockConnection(): Connection {
    const self = this

    return {
      // Event registration
      onInitialize: vi.fn((handler) => {
        self.handlers.onInitialize = handler
      }),
      onInitialized: vi.fn((handler) => {
        self.handlers.onInitialized = handler
      }),
      onDidChangeConfiguration: vi.fn((handler) => {
        self.handlers.onDidChangeConfiguration = handler
      }),
      onCompletion: vi.fn((handler) => {
        self.handlers.onCompletion = handler
      }),
      onCompletionResolve: vi.fn((handler) => {
        self.handlers.onCompletionResolve = handler
      }),
      onHover: vi.fn((handler) => {
        self.handlers.onHover = handler
      }),
      onShutdown: vi.fn(),
      onExit: vi.fn(),

      // Message sending
      sendDiagnostics: vi.fn((params: PublishDiagnosticsParams) => {
        self.publishedDiagnostics.set(params.uri, {
          uri: params.uri,
          diagnostics: params.diagnostics,
          timestamp: Date.now(),
        })
      }),
      sendNotification: vi.fn(),
      sendRequest: vi.fn(),

      // Client interface
      client: {
        register: vi.fn().mockResolvedValue(undefined),
        unregister: vi.fn().mockResolvedValue(undefined),
      },

      // Workspace interface
      workspace: {
        getConfiguration: vi.fn().mockResolvedValue({}),
        onDidChangeWorkspaceFolders: vi.fn(),
      },

      // Lifecycle
      listen: vi.fn(),

      // Console
      console: createMockConsole(),
    } as unknown as Connection
  }

  /**
   * Create mock TextDocuments that tracks our document state
   */
  private createMockTextDocuments(): TextDocuments<TextDocument> {
    const self = this

    return {
      get: (uri: string) => {
        const data = self.documentContents.get(uri)
        if (!data) return undefined
        return TextDocument.create(uri, data.languageId, data.version, data.content)
      },
      all: () => {
        return Array.from(self.documentContents.entries()).map(([uri, data]) =>
          TextDocument.create(uri, data.languageId, data.version, data.content)
        )
      },
      keys: () => Array.from(self.documentContents.keys()),
      onDidOpen: vi.fn((handler) => {
        self.documentHandlers.onDidOpen = handler
      }),
      onDidChangeContent: vi.fn((handler) => {
        self.documentHandlers.onDidChangeContent = handler
      }),
      onDidSave: vi.fn((handler) => {
        self.documentHandlers.onDidSave = handler
      }),
      onDidClose: vi.fn((handler) => {
        self.documentHandlers.onDidClose = handler
      }),
      onWillSave: vi.fn(),
      onWillSaveWaitUntil: vi.fn(),
      listen: vi.fn(),
    } as unknown as TextDocuments<TextDocument>
  }

  /**
   * Initialize the server (simulates client connecting)
   */
  async initialize(
    params: Partial<InitializeParams> = {}
  ): Promise<InitializeResult> {
    const fullParams: InitializeParams = {
      processId: null,
      capabilities: {
        workspace: {
          configuration: true,
          workspaceFolders: true,
        },
        textDocument: {
          publishDiagnostics: {
            relatedInformation: true,
          },
          completion: {
            completionItem: {
              snippetSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
            },
          },
          hover: {
            contentFormat: ['markdown', 'plaintext'],
          },
        },
      },
      rootUri: 'file:///workspace',
      workspaceFolders: [{ uri: 'file:///workspace', name: 'workspace' }],
      ...params,
    }

    // Simulate server initialization by calling the capability creator
    const result = createCapabilities({
      hasWorkspaceFolderCapability: true,
      hasConfigurationCapability: true,
    })

    this.initialized = true
    return result
  }

  /**
   * Open a document in the server
   */
  openDocument(uri: string, content: string, languageId: string = 'typescript'): TextDocument {
    const version = 1
    this.documentContents.set(uri, { content, version, languageId })

    const document = TextDocument.create(uri, languageId, version, content)

    // Trigger document sync handler
    this.documentSyncHandler.handleOpen(document)

    return document
  }

  /**
   * Update a document's content
   */
  changeDocument(uri: string, content: string): TextDocument {
    const existing = this.documentContents.get(uri)
    if (!existing) {
      throw new Error(`Document ${uri} is not open`)
    }

    const version = existing.version + 1
    this.documentContents.set(uri, { content, version, languageId: existing.languageId })

    const document = TextDocument.create(uri, existing.languageId, version, content)

    // Trigger document sync handler
    this.documentSyncHandler.handleChange(document)

    return document
  }

  /**
   * Save a document
   */
  saveDocument(uri: string): TextDocument {
    const existing = this.documentContents.get(uri)
    if (!existing) {
      throw new Error(`Document ${uri} is not open`)
    }

    const document = TextDocument.create(uri, existing.languageId, existing.version, existing.content)

    // Trigger document sync handler
    this.documentSyncHandler.handleSave(document)

    return document
  }

  /**
   * Close a document
   */
  closeDocument(uri: string): void {
    if (!this.documentContents.has(uri)) {
      throw new Error(`Document ${uri} is not open`)
    }

    // Trigger document sync handler
    this.documentSyncHandler.handleClose(uri)

    // Clean up
    this.documentContents.delete(uri)
    this.diagnosticsProvider.clear(uri)
  }

  /**
   * Request completions at a position
   */
  getCompletions(
    uri: string,
    line: number,
    character: number
  ): CompletionItem[] | CompletionList | null {
    const params: CompletionParams = {
      textDocument: { uri },
      position: { line, character },
    }

    return this.completionProvider.onCompletion(params)
  }

  /**
   * Request hover at a position
   */
  getHover(uri: string, line: number, character: number): Hover | null {
    const params: HoverParams = {
      textDocument: { uri },
      position: { line, character },
    }

    return this.hoverProvider.onHover(params)
  }

  /**
   * Get published diagnostics for a URI
   */
  getDiagnostics(uri: string): Diagnostic[] {
    return this.publishedDiagnostics.get(uri)?.diagnostics || []
  }

  /**
   * Wait for diagnostics to be published
   */
  async waitForDiagnostics(uri: string, timeoutMs: number = 1000): Promise<Diagnostic[]> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const published = this.publishedDiagnostics.get(uri)
      if (published && published.timestamp > startTime) {
        return published.diagnostics
      }
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    // Return whatever we have, even if it's old
    return this.getDiagnostics(uri)
  }

  /**
   * Validate a document immediately (bypass debouncing)
   */
  validateDocumentImmediate(uri: string): void {
    const existing = this.documentContents.get(uri)
    if (!existing) {
      throw new Error(`Document ${uri} is not open`)
    }

    const document = TextDocument.create(uri, existing.languageId, existing.version, existing.content)
    this.diagnosticsProvider.validateImmediate(document)
  }

  /**
   * Clear all published diagnostics
   */
  clearDiagnostics(): void {
    this.publishedDiagnostics.clear()
  }

  /**
   * Reset the harness to initial state
   */
  reset(): void {
    this.publishedDiagnostics.clear()
    this.documentContents.clear()
    this.documentSyncHandler.cancelAll()
    this.initialized = false
  }

  /**
   * Shutdown the harness
   */
  shutdown(): void {
    this.documentSyncHandler.cancelAll()
    this.reset()
  }
}

/**
 * Create a new test harness instance
 */
export function createTestHarness(): TestHarness {
  return new TestHarness()
}

/**
 * Helper to create a file URI
 */
export function fileUri(path: string): string {
  if (path.startsWith('file://')) {
    return path
  }
  return `file://${path.startsWith('/') ? '' : '/'}${path}`
}

/**
 * Helper to get completion labels from result
 */
export function getCompletionLabels(
  result: CompletionItem[] | CompletionList | null
): string[] {
  if (!result) return []
  const items = Array.isArray(result) ? result : result.items
  return items.map((item) => item.label)
}
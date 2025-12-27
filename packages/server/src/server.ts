/**
 * @acp:category("entry-point")
 * @acp:agent-instructions("Main entry point for the ACP Language Server. Handles connection setup, initialization, and lifecycle management per LSP 3.17 specification.")
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  DidChangeConfigurationNotification,
} from 'vscode-languageserver/node.js'
import { TextDocument } from 'vscode-languageserver-textdocument'

import { createCapabilities } from './capabilities.js'
import { DocumentManager } from './documents/manager.js'
import { DocumentSyncHandler } from './documents/sync.js'
import { ConfigurationStore } from './services/configuration.js'
import { DiagnosticsProvider } from './providers/diagnostics.js'
import { CompletionProvider } from './providers/completion.js'
import { HoverProvider } from './providers/hover.js'
import { Logger, LogLevel } from './utils/logger.js'
import { SERVER_NAME, SERVER_VERSION } from '@acp-lsp/shared'

// Create LSP connection using Node.js IPC transport
const connection = createConnection(ProposedFeatures.all)

// Create document manager for tracking open text documents
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

// Core services (initialized during onInitialize)
let documentManager: DocumentManager
let documentSyncHandler: DocumentSyncHandler
let configStore: ConfigurationStore
let diagnosticsProvider: DiagnosticsProvider
let completionProvider: CompletionProvider
let hoverProvider: HoverProvider
let logger: Logger

// Client capability flags
let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false
let hasDiagnosticRelatedInformationCapability = false

/**
 * Handle server initialization
 * This is called when the connection is established
 */
connection.onInitialize((params: InitializeParams): InitializeResult => {
  // Create logger first so we can log initialization progress
  logger = new Logger(connection.console, LogLevel.Info)
  logger.info(`${SERVER_NAME} v${SERVER_VERSION} initializing...`)

  const capabilities = params.capabilities

  // Detect client capabilities
  hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration)

  hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders)

  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  )

  // Log detected capabilities
  logger.debug('Client capabilities detected:', {
    configuration: hasConfigurationCapability,
    workspaceFolders: hasWorkspaceFolderCapability,
    diagnosticRelatedInformation: hasDiagnosticRelatedInformationCapability,
  })

  // Initialize core services
  configStore = new ConfigurationStore(connection, hasConfigurationCapability)
  documentManager = new DocumentManager(documents, logger)
  diagnosticsProvider = new DiagnosticsProvider(connection, documentManager, logger)
  completionProvider = new CompletionProvider(documentManager, logger)
  hoverProvider = new HoverProvider(documentManager, logger)

  // Initialize document sync handler with debounced validation
  documentSyncHandler = new DocumentSyncHandler(
    documentManager,
    (document) => diagnosticsProvider.validate(document),
    logger,
    { validationDebounceMs: 300, validateOnOpen: true, validateOnSave: true }
  )

  // Log workspace folders if available
  if (params.workspaceFolders) {
    logger.info(`Workspace folders: ${params.workspaceFolders.map((f) => f.name).join(', ')}`)
  }

  // Return server capabilities
  return createCapabilities({
    hasWorkspaceFolderCapability,
    hasConfigurationCapability,
  })
})

/**
 * Handle post-initialization
 * Register for configuration changes and set up dynamic registrations
 */
connection.onInitialized(() => {
  logger.info(`${SERVER_NAME} v${SERVER_VERSION} initialized successfully`)

  // Register for configuration change notifications
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined)
  }

  // Register for workspace folder change notifications
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((event) => {
      logger.info('Workspace folders changed')
      logger.debug('Added folders:', event.added.map((f) => f.name))
      logger.debug('Removed folders:', event.removed.map((f) => f.name))
    })
  }
})

/**
 * Handle configuration changes
 */
connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Clear all cached document settings
    configStore.clearAllDocumentSettings()
  } else {
    // Apply global settings change
    configStore.updateGlobalSettings(change.settings?.acp || {})
  }

  // Re-validate all open documents with new settings
  documents.all().forEach((doc) => {
    diagnosticsProvider.validate(doc)
  })
})

/**
 * Handle completion requests
 * Provides context-aware completions for ACP annotations
 */
connection.onCompletion((params) => {
  return completionProvider.onCompletion(params)
})

/**
 * Handle completion resolve requests
 * Adds additional documentation to completion items
 */
connection.onCompletionResolve((item) => {
  return completionProvider.onCompletionResolve(item)
})

/**
 * Handle hover requests
 * Provides rich contextual information for ACP annotations and variables
 */
connection.onHover((params) => {
  return hoverProvider.onHover(params)
})

/**
 * Handle document open events
 * Delegates to DocumentSyncHandler for metadata initialization and validation
 */
documents.onDidOpen((event) => {
  documentSyncHandler.handleOpen(event.document)
})

/**
 * Handle document content changes
 * Delegates to DocumentSyncHandler for debounced validation
 */
documents.onDidChangeContent((change) => {
  documentSyncHandler.handleChange(change.document)
})

/**
 * Handle document save events
 * Delegates to DocumentSyncHandler for immediate validation
 */
documents.onDidSave((event) => {
  documentSyncHandler.handleSave(event.document)
})

/**
 * Handle document close events
 * Cleans up metadata, diagnostics, and cached settings
 */
documents.onDidClose((event) => {
  const uri = event.document.uri
  documentSyncHandler.handleClose(uri)

  // Clear diagnostics for the closed document
  diagnosticsProvider.clear(uri)

  // Clear cached settings
  configStore.clearDocumentSettings(uri)
})

/**
 * Handle shutdown request
 */
connection.onShutdown(() => {
  logger.info(`${SERVER_NAME} shutting down...`)

  // Cancel any pending validations
  documentSyncHandler.cancelAll()
})

/**
 * Handle exit notification
 */
connection.onExit(() => {
  logger.info(`${SERVER_NAME} exiting`)
  process.exit(0)
})

// Make the text document manager listen on the connection
// for open, change, and close text document events
documents.listen(connection)

// Listen on the connection
connection.listen()
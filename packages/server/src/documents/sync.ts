/**
 * @acp:category("service")
 * @acp:agent-instructions("Document sync handler that manages document lifecycle events with debounced validation for performance")
 */

import type { TextDocument } from 'vscode-languageserver-textdocument'
import { TextDocumentSyncKind, type TextDocumentSyncOptions } from 'vscode-languageserver'
import type { DocumentManager } from './manager.js'
import type { Logger } from '../utils/logger.js'

/**
 * Options for document synchronization behavior
 */
export interface SyncOptions {
  /** Debounce delay in milliseconds for validation after content changes */
  validationDebounceMs: number
  /** Whether to validate immediately on save */
  validateOnSave: boolean
  /** Whether to validate when a document is opened */
  validateOnOpen: boolean
}

/**
 * Default sync options
 */
export const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  validationDebounceMs: 300,
  validateOnSave: true,
  validateOnOpen: true,
}

/**
 * Handles document lifecycle events with debounced validation for performance.
 * Prevents validation storms during rapid typing by coalescing validation requests.
 */
export class DocumentSyncHandler {
  private pendingValidations = new Map<string, NodeJS.Timeout>()
  private options: SyncOptions

  constructor(
    private documentManager: DocumentManager,
    private onValidate: (document: TextDocument) => void,
    private logger: Logger,
    options: Partial<SyncOptions> = {}
  ) {
    this.options = { ...DEFAULT_SYNC_OPTIONS, ...options }
  }

  /**
   * Get LSP text document sync options for capability negotiation
   */
  static getSyncOptions(): TextDocumentSyncOptions {
    return {
      openClose: true,
      change: TextDocumentSyncKind.Incremental,
      save: { includeText: true },
    }
  }

  /**
   * Handle document opened event
   */
  handleOpen(document: TextDocument): void {
    this.logger.debug(`DocumentSyncHandler: opened ${document.uri}`)
    this.documentManager.initializeDocument(document)
    if (this.options.validateOnOpen) {
      this.scheduleValidation(document)
    }
  }

  /**
   * Handle document content changed event
   */
  handleChange(document: TextDocument): void {
    this.logger.debug(`DocumentSyncHandler: changed ${document.uri} (v${document.version})`)
    this.documentManager.onDocumentChange(document)
    this.scheduleValidation(document)
  }

  /**
   * Handle document closed event
   */
  handleClose(uri: string): void {
    this.logger.debug(`DocumentSyncHandler: closed ${uri}`)
    this.cancelValidation(uri)
    this.documentManager.onDocumentClose(uri)
  }

  /**
   * Handle document saved event
   */
  handleSave(document: TextDocument): void {
    this.logger.debug(`DocumentSyncHandler: saved ${document.uri}`)
    if (this.options.validateOnSave) {
      // Cancel any pending validation and validate immediately on save
      this.cancelValidation(document.uri)
      this.onValidate(document)
    }
  }

  /**
   * Schedule validation with debouncing.
   * Multiple rapid changes will be coalesced into a single validation.
   */
  private scheduleValidation(document: TextDocument): void {
    const uri = document.uri
    this.cancelValidation(uri)

    const timer = setTimeout(() => {
      this.pendingValidations.delete(uri)
      // Re-fetch the document to ensure we have the latest version
      const currentDoc = this.documentManager.get(uri)
      if (currentDoc) {
        this.onValidate(currentDoc)
      }
    }, this.options.validationDebounceMs)

    this.pendingValidations.set(uri, timer)
  }

  /**
   * Cancel any pending validation for a document
   */
  private cancelValidation(uri: string): void {
    const timer = this.pendingValidations.get(uri)
    if (timer) {
      clearTimeout(timer)
      this.pendingValidations.delete(uri)
    }
  }

  /**
   * Cancel all pending validations (e.g., on shutdown)
   */
  cancelAll(): void {
    for (const timer of this.pendingValidations.values()) {
      clearTimeout(timer)
    }
    this.pendingValidations.clear()
    this.logger.debug('DocumentSyncHandler: cancelled all pending validations')
  }

  /**
   * Get the number of pending validations (useful for testing)
   */
  get pendingCount(): number {
    return this.pendingValidations.size
  }
}
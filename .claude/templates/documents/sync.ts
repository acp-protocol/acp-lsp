/**
 * ACP Language Server - Document Sync Handler
 * @acp:purpose Document Sync - Handles document lifecycle with debounced validation
 * @acp:module "Documents"
 */
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocumentSyncKind, TextDocumentSyncOptions } from 'vscode-languageserver';
import { DocumentManager } from './manager';
import { Logger } from '../utils/logger';

export interface SyncOptions {
  validationDebounceMs: number;
  validateOnSave: boolean;
  validateOnOpen: boolean;
}

export class DocumentSyncHandler {
  private pendingValidations = new Map<string, NodeJS.Timeout>();
  private options: SyncOptions;

  constructor(
    private documentManager: DocumentManager,
    private onValidate: (document: TextDocument) => void,
    private logger: Logger,
    options: Partial<SyncOptions> = {}
  ) {
    this.options = { validationDebounceMs: 300, validateOnSave: true, validateOnOpen: true, ...options };
  }

  static getSyncOptions(): TextDocumentSyncOptions {
    return { openClose: true, change: TextDocumentSyncKind.Incremental, save: { includeText: true } };
  }

  handleOpen(document: TextDocument): void {
    this.documentManager.updateDocumentInfo(document);
    if (this.options.validateOnOpen) this.scheduleValidation(document);
  }

  handleChange(document: TextDocument): void {
    this.documentManager.updateDocumentInfo(document);
    this.scheduleValidation(document);
  }

  handleClose(uri: string): void {
    this.cancelValidation(uri);
    this.documentManager.removeDocumentInfo(uri);
  }

  handleSave(document: TextDocument): void {
    if (this.options.validateOnSave) {
      this.cancelValidation(document.uri);
      this.onValidate(document);
    }
  }

  private scheduleValidation(document: TextDocument): void {
    const uri = document.uri;
    this.cancelValidation(uri);
    const timer = setTimeout(() => {
      this.pendingValidations.delete(uri);
      const doc = this.documentManager.getDocument(uri);
      if (doc) this.onValidate(doc);
    }, this.options.validationDebounceMs);
    this.pendingValidations.set(uri, timer);
  }

  private cancelValidation(uri: string): void {
    const timer = this.pendingValidations.get(uri);
    if (timer) { clearTimeout(timer); this.pendingValidations.delete(uri); }
  }

  cancelAll(): void {
    for (const timer of this.pendingValidations.values()) clearTimeout(timer);
    this.pendingValidations.clear();
  }
}

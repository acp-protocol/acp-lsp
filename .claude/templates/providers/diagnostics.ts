/**
 * ACP Language Server - Diagnostics Provider
 * @acp:purpose Diagnostics - Publishes validation results to client
 * @acp:module "Providers"
 */
import { Connection, Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentManager } from '../documents/manager';
import { SchemaValidator } from '../services/schema-validator';
import { AnnotationParser } from '../parsers/annotation-parser';
import { Logger } from '../utils/logger';

export class DiagnosticsProvider {
  private logger: Logger;

  constructor(
    private connection: Connection,
    private documentManager: DocumentManager,
    private schemaValidator: SchemaValidator,
    private annotationParser: AnnotationParser,
    logger: Logger,
    private supportsRelatedInformation: boolean
  ) {
    this.logger = logger.child('DiagnosticsProvider');
  }

  validate(document: TextDocument): void {
    const diagnostics: Diagnostic[] = [];
    const info = this.documentManager.updateDocumentInfo(document);

    // Schema validation for JSON files
    if (info.isAcpConfig || info.isAcpCache || info.isAcpVars) {
      const result = this.schemaValidator.validate(document);
      diagnostics.push(...result.diagnostics);
    }

    // Annotation validation for source files
    if (info.hasAnnotations && this.documentManager.isAnnotationSupported(document.languageId)) {
      const result = this.annotationParser.parse(document);
      diagnostics.push(...result.diagnostics);
    }

    this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
    this.logger.debug(`Published ${diagnostics.length} diagnostics`);
  }

  clear(uri: string): void {
    this.connection.sendDiagnostics({ uri, diagnostics: [] });
  }

  validateAll(): void {
    for (const document of this.documentManager.getAllDocuments()) {
      this.validate(document);
    }
  }
}

/**
 * ACP Language Server - Main Entry Point
 * @acp:purpose LSP Server - Initializes and runs the ACP language server
 * @acp:module "Server" - Core server infrastructure
 * @acp:lock restricted - Core lifecycle, changes require review
 */
import {
  createConnection, TextDocuments, ProposedFeatures,
  InitializeParams, InitializeResult, DidChangeConfigurationNotification,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createCapabilities } from './capabilities';
import { DocumentManager } from './documents/manager';
import { DocumentSyncHandler } from './documents/sync';
import { ConfigurationStore } from './services/configuration';
import { SchemaValidator } from './services/schema-validator';
import { AnnotationParser } from './parsers/annotation-parser';
import { DiagnosticsProvider } from './providers/diagnostics';
import { CompletionProvider } from './providers/completion';
import { HoverProvider } from './providers/hover';
import { Logger, LogLevel } from './utils/logger';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let logger: Logger;
let documentManager: DocumentManager;
let syncHandler: DocumentSyncHandler;
let configStore: ConfigurationStore;
let schemaValidator: SchemaValidator;
let annotationParser: AnnotationParser;
let diagnosticsProvider: DiagnosticsProvider;
let completionProvider: CompletionProvider;
let hoverProvider: HoverProvider;
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  logger = new Logger(connection.console);
  logger.setLevel(LogLevel.Info);
  logger.info('ACP Language Server initializing...');

  const capabilities = params.capabilities;
  hasConfigurationCapability = !!(capabilities.workspace?.configuration);
  hasWorkspaceFolderCapability = !!(capabilities.workspace?.workspaceFolders);

  configStore = new ConfigurationStore(connection, hasConfigurationCapability);
  documentManager = new DocumentManager(documents, logger);
  schemaValidator = new SchemaValidator(logger);
  annotationParser = new AnnotationParser(logger);

  diagnosticsProvider = new DiagnosticsProvider(
    connection, documentManager, schemaValidator, annotationParser, logger,
    !!(capabilities.textDocument?.publishDiagnostics?.relatedInformation)
  );

  completionProvider = new CompletionProvider(documentManager, annotationParser, schemaValidator, logger);
  hoverProvider = new HoverProvider(documentManager, annotationParser, schemaValidator, logger);
  syncHandler = new DocumentSyncHandler(documentManager, (doc) => diagnosticsProvider.validate(doc), logger);

  return createCapabilities({ hasWorkspaceFolderCapability, hasConfigurationCapability });
});

connection.onInitialized(async () => {
  logger.info('ACP Language Server initialized');
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  await configStore.initialize();
});

documents.onDidOpen((e) => syncHandler.handleOpen(e.document));
documents.onDidChangeContent((e) => syncHandler.handleChange(e.document));
documents.onDidClose((e) => {
  syncHandler.handleClose(e.document.uri);
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});
documents.onDidSave((e) => syncHandler.handleSave(e.document));

connection.onCompletion((params) => completionProvider.provideCompletions(params));
connection.onCompletionResolve((item) => completionProvider.resolveCompletion(item));
connection.onHover((params) => hoverProvider.provideHover(params));
connection.onShutdown(() => { logger.info('Shutting down'); syncHandler.cancelAll(); });

documents.listen(connection);
connection.listen();

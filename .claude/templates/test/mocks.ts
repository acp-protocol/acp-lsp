/**
 * ACP Language Server - Test Utilities
 * @acp:purpose Test Mocks - Provides mock implementations for testing
 * @acp:module "Test"
 */
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments, RemoteConsole } from 'vscode-languageserver';
import { Logger, LogLevel } from '../utils/logger';

/**
 * Create a mock logger for testing
 */
export function createMockLogger(): Logger {
  const mockConsole: RemoteConsole = {
    error: () => {},
    warn: () => {},
    info: () => {},
    log: () => {},
    debug: () => {},
    connection: {} as any,
  };
  const logger = new Logger(mockConsole);
  logger.setLevel(LogLevel.Error); // Suppress logs in tests
  return logger;
}

/**
 * Create a mock TextDocuments instance
 */
export function createMockTextDocuments(): TextDocuments<TextDocument> {
  const docs = new Map<string, TextDocument>();
  return {
    get: (uri: string) => docs.get(uri),
    all: () => Array.from(docs.values()),
    keys: () => Array.from(docs.keys()),
    listen: () => {},
    onDidOpen: () => ({ dispose: () => {} }),
    onDidClose: () => ({ dispose: () => {} }),
    onDidChangeContent: () => ({ dispose: () => {} }),
    onWillSave: () => ({ dispose: () => {} }),
    onWillSaveWaitUntil: () => ({ dispose: () => {} }),
    onDidSave: () => ({ dispose: () => {} }),
  } as any;
}

/**
 * Create a test document
 */
export function createTestDocument(
  uri: string,
  languageId: string,
  content: string,
  version = 1
): TextDocument {
  return TextDocument.create(uri, languageId, version, content);
}

/**
 * Create a TypeScript document with annotations
 */
export function createAnnotatedTypeScript(content: string, uri = 'file:///test.ts'): TextDocument {
  return createTestDocument(uri, 'typescript', content);
}

/**
 * Create a Python document with annotations
 */
export function createAnnotatedPython(content: string, uri = 'file:///test.py'): TextDocument {
  return createTestDocument(uri, 'python', content);
}

/**
 * Create an ACP config JSON document
 */
export function createAcpConfigDocument(config: object, uri = 'file:///.acp.config.json'): TextDocument {
  return createTestDocument(uri, 'json', JSON.stringify(config, null, 2));
}

/**
 * Sample annotations for testing
 */
export const SAMPLE_ANNOTATIONS = {
  fileLevelPurpose: '// @acp:purpose Authentication Service - Handles user authentication and session management',
  fileLevelModule: '// @acp:module "Auth" - Core authentication module',
  lockFrozen: '// @acp:lock frozen - Security-critical code, do not modify',
  lockRestricted: '// @acp:lock restricted - Requires approval for changes',
  fnDoc: '// @acp:fn validateUser - Validates user credentials against database',
  paramDoc: '// @acp:param username - The username to validate',
  returnsDoc: '// @acp:returns boolean - True if user is valid',
  throwsDoc: '// @acp:throws AuthError - When credentials are invalid | retry: false',
  layerService: '// @acp:layer service - Business logic layer',
  variableRef: '// @acp:fn uses $SYM_AUTH_SERVICE - Authentication dependency',
  invalidLock: '// @acp:lock invalid-level - This should error',
  unknownNamespace: '// @acp:unknown something - This namespace is unknown',
};

/**
 * Sample valid ACP config
 */
export const SAMPLE_CONFIG = {
  version: '1.0.0',
  project: {
    name: 'test-project',
    description: 'A test project',
  },
};

/**
 * Sample invalid ACP config (missing version)
 */
export const INVALID_CONFIG = {
  project: {
    name: 'test-project',
  },
};

/**
 * ACP Language Server - Document Manager
 * @acp:purpose Document Management - Tracks open documents and metadata
 * @acp:module "Documents"
 */
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver';
import { Logger } from '../utils/logger';

export interface DocumentInfo {
  uri: string;
  languageId: string;
  version: number;
  isAcpConfig: boolean;
  isAcpCache: boolean;
  isAcpVars: boolean;
  hasAnnotations: boolean;
  lastValidated: number;
}

export interface CommentPatterns {
  line: string;
  blockStart: string;
  blockEnd: string;
  docStart?: string;
  docEnd?: string;
}

export class DocumentManager {
  private documentInfo = new Map<string, DocumentInfo>();

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
  };

  constructor(private documents: TextDocuments<TextDocument>, private logger: Logger) {}

  getDocument(uri: string): TextDocument | undefined { return this.documents.get(uri); }
  getAllDocuments(): TextDocument[] { return this.documents.all(); }
  getDocumentInfo(uri: string): DocumentInfo | undefined { return this.documentInfo.get(uri); }

  updateDocumentInfo(document: TextDocument): DocumentInfo {
    const uri = document.uri;
    const filename = uri.split('/').pop() || '';
    const info: DocumentInfo = {
      uri,
      languageId: document.languageId,
      version: document.version,
      isAcpConfig: /\.?acp\.config\.json$/.test(filename),
      isAcpCache: /\.?acp\.cache\.json$/.test(filename),
      isAcpVars: /\.?acp\.vars\.json$/.test(filename),
      hasAnnotations: document.getText().includes('@acp:'),
      lastValidated: Date.now(),
    };
    this.documentInfo.set(uri, info);
    return info;
  }

  removeDocumentInfo(uri: string): void { this.documentInfo.delete(uri); }
  needsRevalidation(document: TextDocument): boolean {
    const info = this.documentInfo.get(document.uri);
    return !info || info.version !== document.version;
  }

  getCommentPatterns(languageId: string): CommentPatterns {
    return DocumentManager.COMMENT_PATTERNS[languageId] || DocumentManager.COMMENT_PATTERNS.typescript;
  }

  isAnnotationSupported(languageId: string): boolean {
    return languageId in DocumentManager.COMMENT_PATTERNS;
  }

  getAnnotatedDocuments(): TextDocument[] {
    return this.documents.all().filter((doc) => this.documentInfo.get(doc.uri)?.hasAnnotations);
  }

  getAcpJsonDocuments(): TextDocument[] {
    return this.documents.all().filter((doc) => {
      const info = this.documentInfo.get(doc.uri);
      return info && (info.isAcpConfig || info.isAcpCache || info.isAcpVars);
    });
  }
}

---
name: documents
description: Implement document manager for text synchronization and change tracking
version: 1.0.0
category: foundation
phase: 1
priority: P0
pattern: generator
inputs:
  - LSP TextDocumentSyncKind
  - Supported file extensions
  - Change event handling
outputs:
  - packages/server/src/documents/manager.ts
  - packages/server/src/documents/types.ts
  - Document lifecycle handling
handoffs:
  - target: foundation:schema
    context: "Documents tracked, schema validator can validate on change"
---

# Document Manager Implementation

## Purpose

Implement a document manager that tracks open documents, handles incremental changes, and provides document content to other providers.

## Prerequisites

- [ ] Server implemented (`/foundation:server`)
- [ ] TextDocuments from vscode-languageserver available

## Workflow

### Phase 1: Create Document Manager

Create `packages/server/src/documents/manager.ts`:

```typescript
import {
  TextDocuments,
  TextDocumentChangeEvent,
  Connection,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { EventEmitter } from 'events';

export interface DocumentInfo {
  uri: string;
  languageId: string;
  version: number;
  isAcpFile: boolean;
  hasAnnotations: boolean;
}

export class DocumentManager extends EventEmitter {
  private documents: TextDocuments<TextDocument>;
  private documentInfo: Map<string, DocumentInfo> = new Map();

  constructor(private connection: Connection) {
    super();
    this.documents = new TextDocuments(TextDocument);
    this.setupListeners();
  }

  private setupListeners(): void {
    this.documents.onDidOpen((event) => {
      this.trackDocument(event.document);
      this.emit('open', event.document);
    });

    this.documents.onDidChangeContent((event) => {
      this.updateDocumentInfo(event.document);
      this.emit('change', event.document);
    });

    this.documents.onDidClose((event) => {
      this.documentInfo.delete(event.document.uri);
      this.emit('close', event.document);
    });
  }

  private trackDocument(document: TextDocument): void {
    const info: DocumentInfo = {
      uri: document.uri,
      languageId: document.languageId,
      version: document.version,
      isAcpFile: this.isAcpFile(document.uri),
      hasAnnotations: this.hasAnnotations(document.getText()),
    };
    this.documentInfo.set(document.uri, info);
  }

  private isAcpFile(uri: string): boolean {
    return uri.endsWith('.acp.config.json') ||
           uri.endsWith('.acp.cache.json') ||
           uri.endsWith('.acp.vars.json');
  }

  private hasAnnotations(content: string): boolean {
    return content.includes('@acp:');
  }

  get(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
  }

  getInfo(uri: string): DocumentInfo | undefined {
    return this.documentInfo.get(uri);
  }

  all(): TextDocument[] {
    return this.documents.all();
  }

  listen(connection: Connection): void {
    this.documents.listen(connection);
  }
}
```

### Phase 2: Create Type Definitions

Create `packages/server/src/documents/types.ts` with shared types.

### Phase 3: Integrate with Server

Update server.ts to use DocumentManager.

## Completion Criteria

- [ ] Documents tracked on open
- [ ] Changes detected incrementally
- [ ] Close events clean up state
- [ ] ACP files detected correctly
- [ ] Annotation presence detected
- [ ] Events emitted for providers

---
name: server
description: Implement the core LSP server with initialization and capability negotiation
version: 1.0.0
category: foundation
phase: 1
priority: P0
pattern: generator
inputs:
  - LSP specification 3.17
  - VS Code extension API
  - ACP capability requirements
outputs:
  - packages/server/src/server.ts
  - packages/server/src/capabilities.ts
  - Connection handling and lifecycle
handoffs:
  - target: foundation:documents
    context: "Server running, document manager can handle text synchronization"
---

# LSP Server Implementation

## Purpose

Implement the core Language Server Protocol server with proper initialization, capability negotiation, and connection lifecycle management.

## Prerequisites

- [ ] Project initialized (`/foundation:init`)
- [ ] Dependencies installed

## Workflow

### Phase 1: Create Server Entry Point

Create `packages/server/src/server.ts`:

```typescript
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['@', ':', '$', '.'],
        resolveProvider: true,
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeActionProvider: {
        codeActionKinds: [
          'quickfix',
          'refactor',
          'source',
        ],
      },
      codeLensProvider: {
        resolveProvider: true,
      },
      inlayHintProvider: true,
      semanticTokensProvider: {
        legend: {
          tokenTypes: [
            'acp-prefix', 'acp-namespace', 'acp-value',
            'acp-directive', 'acp-variable', 'acp-modifier',
          ],
          tokenModifiers: ['deprecated', 'readonly', 'warning'],
        },
        full: true,
        delta: true,
      },
    },
  };
});

connection.onInitialized(() => {
  connection.console.log('ACP Language Server initialized');
});

documents.listen(connection);
connection.listen();
```

### Phase 2: Create Capabilities Module

Create `packages/server/src/capabilities.ts` with server capability definitions.

### Phase 3: Validate Server Starts

```bash
cd packages/server
npm run build
node dist/server.js --stdio
```

## Completion Criteria

- [ ] Server compiles without errors
- [ ] Server starts with `--stdio` flag
- [ ] Initialize handshake completes
- [ ] All required capabilities declared
- [ ] Connection lifecycle works (init → initialized → shutdown → exit)

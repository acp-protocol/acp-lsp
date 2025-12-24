---
name: foundation.documents
description: Implement document synchronization with incremental updates, lifecycle management, and language detection
version: 1.0.0
category: foundation
phase: 1
priority: P0
pattern: generator
inputs:
  - Templates from .claude/templates/documents/
  - LSP TextDocumentSyncKind options
outputs:
  - packages/server/src/documents/manager.ts
  - packages/server/src/documents/sync.ts
handoffs:
  - target: foundation.parser
    context: "Document sync complete, parser can access document content"
  - target: foundation.schemas
    context: "Document manager tracks JSON files for schema validation"
---

# Document Synchronization

## Purpose

Implement robust document synchronization between VS Code client and language server with incremental updates for performance and proper lifecycle management.

## Prerequisites

- [ ] Server scaffolding complete (`/foundation scaffold`)

## Workflow

### Phase 1: Copy Document Templates

```bash
cp .claude/templates/documents/manager.ts packages/server/src/documents/manager.ts
cp .claude/templates/documents/sync.ts packages/server/src/documents/sync.ts
```

### Phase 2: Verify Integration

Ensure server.ts imports and uses:
- `DocumentManager` for document tracking
- `DocumentSyncHandler` for lifecycle events

### Phase 3: Test Document Sync

Create test file `packages/server/tests/unit/document-manager.test.ts` using test template.

## Template Reference

### DocumentManager (templates/documents/manager.ts)

| Method | Purpose |
|--------|---------|
| `getDocument(uri)` | Get document by URI |
| `getAllDocuments()` | Get all open documents |
| `updateDocumentInfo()` | Update metadata after changes |
| `getCommentPatterns()` | Language-specific comment patterns |
| `isAnnotationSupported()` | Check if language supports ACP |
| `getAcpJsonDocuments()` | Get all ACP JSON files |

### DocumentSyncHandler (templates/documents/sync.ts)

| Method | Purpose |
|--------|---------|
| `handleOpen()` | Document opened |
| `handleChange()` | Document content changed |
| `handleClose()` | Document closed |
| `handleSave()` | Document saved |
| `cancelAll()` | Cancel pending validations |

## Supported Languages

| Language | Comment Patterns |
|----------|------------------|
| TypeScript/JavaScript | `//`, `/* */`, `/** */` |
| Python | `#`, `"""`, `'''` |
| Rust | `//`, `/* */`, `///` |
| Go | `//`, `/* */` |
| Java | `//`, `/* */`, `/** */` |
| C# | `//`, `/* */`, `///` |
| C/C++ | `//`, `/* */` |

## Completion Criteria

- [ ] `DocumentManager` class implemented
- [ ] `DocumentSyncHandler` handles all lifecycle events
- [ ] Debounced validation on content changes
- [ ] Unit tests pass

## Handoffs

Upon completion:
1. **`/foundation parser`** - Parser uses DocumentManager for content
2. **`/foundation schemas`** - Schema validator uses getAcpJsonDocuments()

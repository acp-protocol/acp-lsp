---
name: foundation.scaffold
description: Create the LSP server scaffolding with lifecycle management, connection handling, and capability negotiation
version: 1.0.0
category: foundation
phase: 1
priority: P0
pattern: generator
inputs:
  - Server capabilities from requirements
  - Templates from .claude/templates/server/
outputs:
  - packages/server/src/server.ts
  - packages/server/src/capabilities.ts
handoffs:
  - target: foundation.documents
    context: "Server scaffolding complete, proceed to document synchronization"
---

# Server Scaffolding

## Purpose

Create the foundational LSP server infrastructure with proper lifecycle management, connection handling, and capability negotiation per LSP 3.17 specification.

## Prerequisites

- [ ] Project initialized via `/project init`
- [ ] Dependencies installed (`pnpm install`)

## Workflow

### Phase 1: Copy Server Template

```bash
cp .claude/templates/server/server.ts packages/server/src/server.ts
cp .claude/templates/server/capabilities.ts packages/server/src/capabilities.ts
```

### Phase 2: Verify Structure

Ensure server.ts includes:
- Connection creation with ProposedFeatures
- TextDocuments manager
- onInitialize handler with capability detection
- onInitialized handler for post-init setup
- Document lifecycle handlers
- Shutdown handler

### Phase 3: Test Server Starts

```bash
cd packages/server
pnpm build
node dist/server.js --stdio
# Should start without errors
```

## Template Reference

The server template at `.claude/templates/server/server.ts` provides:

| Component | Purpose |
|-----------|---------|
| `createConnection()` | LSP connection with all features |
| `TextDocuments` | Document synchronization |
| `Logger` | Structured logging |
| `ConfigurationStore` | Settings management |
| `DocumentManager` | Document metadata |
| `DiagnosticsProvider` | Validation publishing |
| `CompletionProvider` | Completion support |
| `HoverProvider` | Hover information |

## Completion Criteria

- [ ] `packages/server/src/server.ts` exists and compiles
- [ ] `packages/server/src/capabilities.ts` declares all LSP capabilities
- [ ] Server starts without errors
- [ ] TypeScript compilation succeeds

## Handoffs

Upon completion:
1. **`/foundation documents`** - Implement document synchronization
2. **`/foundation parser`** - Add annotation parsing

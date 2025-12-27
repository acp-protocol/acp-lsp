---
name: diagnostics
description: Implement diagnostic provider for ACP validation errors and warnings
version: 1.0.0
category: foundation
phase: 1
priority: P0
pattern: generator
inputs:
  - Schema validation results
  - Annotation parsing results
  - Error code definitions (Section 12)
outputs:
  - packages/server/src/providers/diagnostics.ts
  - Diagnostic aggregation and publishing
  - Error code mapping
handoffs:
  - target: intelligence:parsers
    context: "Diagnostics ready, parsers can contribute language-specific errors"
  - target: review:phase
    context: "Phase 1 complete, ready for phase gate review"
---

# Diagnostic Provider Implementation

## Purpose

Implement a diagnostic provider that aggregates validation errors from schema validation, annotation parsing, and constraint checking, then publishes them to the client.

## Prerequisites

- [ ] Schema validator implemented (`/foundation:schema`)
- [ ] Document manager operational

## Workflow

### Phase 1: Create Diagnostic Provider

Create `packages/server/src/providers/diagnostics.ts`:

```typescript
import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  TextDocumentChangeEvent,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SchemaValidator } from '../services/schemaValidator';
import { DocumentManager } from '../documents/manager';

// Error codes from ACP LSP Requirements Section 12
export const ErrorCodes = {
  // Syntax Errors (E1xx)
  E100: { code: 'E100', message: 'Malformed annotation syntax' },
  E101: { code: 'E101', message: 'Unknown namespace' },
  E102: { code: 'E102', message: 'Invalid lock level' },
  E103: { code: 'E103', message: 'Invalid domain name format' },
  E104: { code: 'E104', message: 'Malformed variable reference' },
  E105: { code: 'E105', message: 'Undefined variable' },
  
  // Structural Errors (E2xx)
  E200: { code: 'E200', message: 'Missing required field' },
  E201: { code: 'E201', message: 'Missing directive separator' },
  E202: { code: 'E202', message: 'Empty directive after separator' },
  
  // Warnings (W0xx)
  W001: { code: 'W001', message: 'Orphaned annotation' },
  W010: { code: 'W010', message: 'Cache may be stale' },
  W011: { code: 'W011', message: 'Hack annotation expired' },
} as const;

export class DiagnosticProvider {
  private pendingValidations: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 100;

  constructor(
    private connection: Connection,
    private documentManager: DocumentManager,
    private schemaValidator: SchemaValidator
  ) {
    this.setupListeners();
  }

  private setupListeners(): void {
    this.documentManager.on('change', (document: TextDocument) => {
      this.scheduleValidation(document);
    });

    this.documentManager.on('open', (document: TextDocument) => {
      this.validateDocument(document);
    });
  }

  private scheduleValidation(document: TextDocument): void {
    const existing = this.pendingValidations.get(document.uri);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      this.validateDocument(document);
      this.pendingValidations.delete(document.uri);
    }, this.debounceMs);

    this.pendingValidations.set(document.uri, timeout);
  }

  async validateDocument(document: TextDocument): Promise<void> {
    const diagnostics: Diagnostic[] = [];

    // Schema validation for JSON files
    if (document.uri.endsWith('.json')) {
      diagnostics.push(...this.schemaValidator.validate(document));
    }

    // Annotation validation for source files
    if (this.hasAnnotations(document)) {
      diagnostics.push(...await this.validateAnnotations(document));
    }

    this.connection.sendDiagnostics({
      uri: document.uri,
      diagnostics,
    });
  }

  private hasAnnotations(document: TextDocument): boolean {
    return document.getText().includes('@acp:');
  }

  private async validateAnnotations(document: TextDocument): Promise<Diagnostic[]> {
    // TODO: Implement annotation validation
    return [];
  }
}
```

### Phase 2: Implement Error Code Mapping

Map all error codes from Section 12 to diagnostic messages.

### Phase 3: Add Debouncing

Ensure rapid typing doesn't overwhelm validation.

### Phase 4: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh diagnostics
```

## Completion Criteria

- [ ] Schema errors reported with correct codes
- [ ] Annotation errors reported with correct codes
- [ ] Debouncing prevents excessive validation
- [ ] Diagnostics clear when errors fixed
- [ ] Error positions are accurate
- [ ] Unit tests with 90% coverage

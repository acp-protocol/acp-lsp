---
name: schema
description: Implement JSON schema validator for ACP configuration files
version: 1.0.0
category: foundation
phase: 1
priority: P0
pattern: generator
inputs:
  - cache.schema.json
  - config.schema.json
  - vars.schema.json
  - sync.schema.json
outputs:
  - packages/server/src/services/schemaValidator.ts
  - Schema loading and caching
  - Validation error mapping
handoffs:
  - target: foundation:diagnostics
    context: "Schema validation ready, diagnostics can report validation errors"
---

# Schema Validator Implementation

## Purpose

Implement a JSON schema validator that validates ACP configuration files against their schemas and produces diagnostics.

## Prerequisites

- [ ] Document manager implemented (`/foundation:documents`)
- [ ] ACP JSON schemas available

## Workflow

### Phase 1: Create Schema Validator Service

Create `packages/server/src/services/schemaValidator.ts`:

```typescript
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export type SchemaType = 'cache' | 'config' | 'vars' | 'sync';

export class SchemaValidator {
  private ajv: Ajv;
  private validators: Map<SchemaType, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    addFormats(this.ajv);
  }

  async loadSchemas(schemasPath: string): Promise<void> {
    const schemaFiles: Record<SchemaType, string> = {
      cache: 'cache.schema.json',
      config: 'config.schema.json',
      vars: 'vars.schema.json',
      sync: 'sync.schema.json',
    };

    for (const [type, filename] of Object.entries(schemaFiles)) {
      const schema = await this.loadSchema(`${schemasPath}/${filename}`);
      this.validators.set(type as SchemaType, this.ajv.compile(schema));
    }
  }

  validate(document: TextDocument): Diagnostic[] {
    const schemaType = this.getSchemaType(document.uri);
    if (!schemaType) return [];

    const validator = this.validators.get(schemaType);
    if (!validator) return [];

    try {
      const content = JSON.parse(document.getText());
      const valid = validator(content);
      
      if (!valid && validator.errors) {
        return this.mapErrorsToDiagnostics(validator.errors, document);
      }
    } catch (e) {
      return [this.createParseErrorDiagnostic(e as Error, document)];
    }

    return [];
  }

  private getSchemaType(uri: string): SchemaType | null {
    if (uri.endsWith('.acp.cache.json')) return 'cache';
    if (uri.endsWith('.acp.config.json')) return 'config';
    if (uri.endsWith('.acp.vars.json')) return 'vars';
    if (uri.endsWith('.acp.sync.json')) return 'sync';
    return null;
  }

  private mapErrorsToDiagnostics(
    errors: ErrorObject[],
    document: TextDocument
  ): Diagnostic[] {
    return errors.map((error) => ({
      severity: DiagnosticSeverity.Error,
      range: this.findErrorRange(error, document),
      message: `${error.instancePath}: ${error.message}`,
      source: 'acp-schema',
      code: error.keyword,
    }));
  }

  private findErrorRange(error: ErrorObject, document: TextDocument): Range {
    // TODO: Map JSON path to line/column
    return {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 1 },
    };
  }
}
```

### Phase 2: Add JSON Path to Position Mapping

Implement accurate error location finding.

### Phase 3: Integrate with Document Manager

Wire up validation on document changes.

## Completion Criteria

- [ ] All four schemas load successfully
- [ ] Valid files produce no diagnostics
- [ ] Invalid files produce accurate diagnostics
- [ ] Error positions are accurate
- [ ] Parse errors handled gracefully
- [ ] Unit tests with 90% coverage

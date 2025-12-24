---
name: foundation.schemas
description: Set up JSON schema validation for all 6 ACP schema types
version: 1.0.0
category: foundation
phase: 1
priority: P0
pattern: generator
inputs:
  - Schemas from ../acp-spec/schemas/v1/
  - Templates from .claude/templates/services/
outputs:
  - packages/server/src/services/schema-validator.ts
  - schemas/v1/*.schema.json
handoffs:
  - target: intelligence.completions
    context: "Schema validation complete, can provide schema-aware completions"
---

# Schema Validation

## Purpose

Implement JSON schema validation for all 6 ACP file types with comprehensive diagnostics.

## Prerequisites

- [ ] Parser complete (`/foundation parser`)
- [ ] acp-spec sibling project available

## Workflow

### Phase 1: Sync Schemas

```bash
.claude/scripts/bash/sync-schemas.sh --json
```

### Phase 2: Copy Validator Template

```bash
cp .claude/templates/services/schema-validator.ts packages/server/src/services/schema-validator.ts
```

### Phase 3: Verify Schema Detection

| Schema Type | File Patterns |
|-------------|---------------|
| config | `.acp.config.json`, `acp.config.json` |
| cache | `.acp.cache.json`, `*.acp.cache.json` |
| vars | `.acp.vars.json`, `*.acp.vars.json` |
| attempts | `acp.attempts.json` |
| sync | `acp.sync.json` |
| primer | `*.primer.json` |

### Phase 4: Test Validation

Create test with valid and invalid JSON fixtures.

## Template Reference

### SchemaValidator (templates/services/schema-validator.ts)

| Method | Purpose |
|--------|---------|
| `detectSchemaType(uri)` | Determine schema from filename |
| `validate(document)` | Validate document against schema |
| `getSchema(type)` | Get schema for completions |

## Completion Criteria

- [ ] All 6 schemas synced to `schemas/v1/`
- [ ] `SchemaValidator` validates all types
- [ ] Diagnostics have correct ranges
- [ ] Unit tests pass

## Handoffs

Upon completion:
1. **`/intelligence completions`** - Schema-aware completions
2. **`/test plan`** - Add schema tests to plan

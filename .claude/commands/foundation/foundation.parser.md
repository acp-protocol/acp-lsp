---
name: foundation.parser
description: Implement basic annotation parsing for TypeScript and JavaScript files
version: 1.0.0
category: foundation
phase: 1
priority: P0
pattern: generator
inputs:
  - EBNF grammar from acp-spec
  - Templates from .claude/templates/parsers/
outputs:
  - packages/server/src/parsers/annotation-parser.ts
handoffs:
  - target: intelligence.parsers
    context: "Base parser complete, extend to all 8 languages"
  - target: foundation.schemas
    context: "Parser ready, can validate annotations"
---

# Annotation Parser

## Purpose

Implement the foundational annotation parser that extracts and validates ACP annotations from source files.

## Prerequisites

- [ ] Document sync complete (`/foundation documents`)

## Workflow

### Phase 1: Copy Parser Template

```bash
cp .claude/templates/parsers/annotation-parser.ts packages/server/src/parsers/annotation-parser.ts
```

### Phase 2: Verify Grammar Implementation

The parser implements the ACP EBNF grammar:

```ebnf
annotation      = "@acp:" namespace directive? ;
namespace       = identifier ;
directive       = value ("-" description)? ("|" metadata)* ;
value           = quoted-string | identifier | variable-ref ;
variable-ref    = "$" identifier ("." modifier)? ;
```

### Phase 3: Validate Namespace Categories

| Category | Namespaces |
|----------|------------|
| file-level | purpose, module, domain, owner, layer, stability, ref |
| symbol-level | fn, class, method, param, returns, throws, example, deprecated |
| constraint | lock, lock-reason, style, behavior, quality, test |
| inline | critical, todo, fixme, perf, hack, debug |

### Phase 4: Validate Lock Levels

| Level | Description |
|-------|-------------|
| frozen | MUST NOT modify |
| restricted | Requires approval |
| approval-required | Needs review |
| tests-required | Must have tests |
| docs-required | Must update docs |
| review-required | Needs code review |
| normal | Standard rules |
| experimental | Changes welcome |

## Template Reference

### AnnotationParser (templates/parsers/annotation-parser.ts)

| Method | Purpose |
|--------|---------|
| `parse(document)` | Parse all annotations in document |
| `getAnnotationAt(pos)` | Get annotation at position |
| `getNamespaces()` | Get all valid namespaces |
| `getLockLevels()` | Get valid lock levels |
| `getLayers()` | Get valid architecture layers |

## Completion Criteria

- [ ] Parser extracts all annotation types correctly
- [ ] Variable references extracted
- [ ] Validation produces diagnostics for errors
- [ ] Unit tests pass
- [ ] Performance target met (<500ms for large files)

## Handoffs

Upon completion:
1. **`/foundation schemas`** - Schema validation can proceed
2. **`/intelligence parsers`** - Extend to all 8 languages

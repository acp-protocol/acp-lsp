---
name: intelligence.completions
description: Implement context-aware completions for annotations, lock levels, layers, and variables
version: 1.0.0
category: intelligence
phase: 2
priority: P0
pattern: generator
inputs:
  - Templates from .claude/templates/providers/
  - Annotation parser output
outputs:
  - packages/server/src/providers/completion.ts
handoffs:
  - target: intelligence.hover
    context: "Completion provider complete, hover uses similar patterns"
---

# Completion Provider

## Purpose

Implement intelligent, context-aware completions for all ACP annotation elements including namespaces, values, and variable references.

## Prerequisites

- [ ] Annotation parser complete (`/foundation parser`)

## Workflow

### Phase 1: Copy Template

```bash
cp .claude/templates/providers/completion.ts packages/server/src/providers/completion.ts
```

### Phase 2: Implement Trigger Contexts

| Context | Trigger | Completions |
|---------|---------|-------------|
| After `@acp:` | Typing namespace | All namespaces |
| After `@acp:lock ` | Space after lock | Lock levels |
| After `@acp:layer ` | Space after layer | Architecture layers |
| After `@acp:stability ` | Space after stability | Stability values |
| After `$` | Dollar sign | Variable names |
| After `$VAR.` | Dot after variable | Modifiers (.full, .ref, .signature) |
| In JSON | Property position | Schema properties |

### Phase 3: Namespace Completions

All 24+ namespaces with documentation:

**File-level**: purpose, module, domain, owner, layer, stability, ref
**Symbol-level**: fn, class, method, param, returns, throws, example, deprecated
**Constraint**: lock, lock-reason, style, behavior, quality, test
**Inline**: critical, todo, fixme, perf, hack, debug

### Phase 4: Lock Level Completions

| Level | Documentation |
|-------|---------------|
| frozen | MUST NOT modify under any circumstances |
| restricted | Modifications require explicit approval |
| approval-required | Changes need review approval |
| tests-required | Must have tests before changes |
| docs-required | Must update docs with changes |
| review-required | Changes need code review |
| normal | Standard modification rules apply |
| experimental | Code is experimental, changes welcome |

### Phase 5: Variable Completions

When `$` is typed, provide completions from:
1. Variables defined in `.acp.vars.json`
2. Symbols from `.acp.cache.json`
3. Cross-file references

Modifiers: `.full`, `.ref`, `.signature`

## Completion Item Format

```typescript
{
  label: "lock",
  kind: CompletionItemKind.Keyword,
  detail: "@acp:lock",
  documentation: {
    kind: MarkupKind.Markdown,
    value: "Modification constraint level..."
  },
  insertText: "lock ${1:level} - ${2:reason}",
  insertTextFormat: InsertTextFormat.Snippet
}
```

## Completion Criteria

- [ ] All namespaces complete with docs
- [ ] Lock levels complete with severity order
- [ ] Layers complete
- [ ] Variable completions from cache
- [ ] Snippets for common patterns
- [ ] Unit tests pass
- [ ] Latency < 50ms

## Handoffs

Upon completion:
1. **`/intelligence hover`** - Hover uses similar lookup
2. **`/test unit`** - Add completion tests

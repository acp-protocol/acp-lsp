---
name: semantic
description: Implement Semantic Tokens for ACP annotation syntax highlighting
version: 1.0.0
category: advanced
phase: 4
priority: P2
pattern: generator
inputs:
  - Annotation parser output
  - Variable references
  - Token type definitions
outputs:
  - packages/server/src/providers/semanticTokens.ts
  - Token legend definition
  - Delta token support
handoffs:
  - target: advanced:lens
    context: "Semantic tokens ready, lens placement can use token boundaries"
  - target: advanced:inlay
    context: "Token positions available for inlay hint placement"
---

# Semantic Tokens Provider

## Purpose

Implement semantic token provider for rich syntax highlighting of ACP annotations, variables, and constraint indicators.

## Prerequisites

- [ ] Code actions ready
- [ ] Annotation parser operational
- [ ] Variable service working

## Workflow

### Phase 1: Generate Provider from Template

```bash
.claude/scripts/bash/generate-provider.sh semanticTokens
```

### Phase 2: Define Token Legend

| Token Type | Applied To | Example Color |
|------------|------------|---------------|
| `acp-prefix` | `@acp:` | Blue |
| `acp-namespace` | `lock`, `domain` | Green |
| `acp-value` | `frozen`, `auth` | Orange |
| `acp-directive` | After ` - ` | Gray |
| `acp-variable-prefix` | `$SYM_` | Purple |
| `acp-variable-name` | `VALIDATE` | Purple bold |
| `acp-modifier` | `.full` | Purple italic |

### Phase 3: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh semanticTokens
```

## Completion Criteria

- [ ] Token legend matches spec
- [ ] Annotations fully tokenized
- [ ] Variables tokenized with modifiers
- [ ] Delta support for performance
- [ ] Unresolved variables show warning modifier
- [ ] Deprecated annotations styled
- [ ] Unit tests pass

---
name: hover
description: Implement rich hover information provider for ACP annotations, variables, and symbols
version: 1.0.0
category: intelligence
phase: 2
priority: P0
pattern: generator
inputs:
  - Annotation metadata from completions provider
  - Cache symbols and file entries
  - Variable definitions from vars file
  - Constraint inheritance rules
outputs:
  - packages/server/src/providers/hover.ts
  - Hover content formatters
  - Lock level visualizations
handoffs:
  - target: intelligence:variables
    context: "Hover implemented, variable resolution can reuse metadata lookups"
  - target: navigation:definition
    context: "Hover shows 'Go to Definition' links, definition provider can share resolution"
---

# Hover Provider Implementation

## Purpose

Implement a comprehensive hover provider that displays rich, contextual information for ACP annotations, variables, symbols, and constraints.

## Prerequisites

- [ ] Completions provider implemented (shared annotation metadata)
- [ ] Cache service loading symbols and files
- [ ] Schema validator operational

## Workflow

### Phase 1: Generate Provider from Template

```bash
.claude/scripts/bash/generate-provider.sh hover
```

### Phase 2: Implement Core Hover Logic

Use the template at `.claude/templates/providers/hover.ts.template` and implement:

1. **Annotation Hover** - Show namespace docs, value meaning, directive
2. **Variable Hover** - Show expansion preview, type, modifiers
3. **Symbol Hover** - Show cache data, call graph summary
4. **Lock Level Hover** - Visual hierarchy diagram

### Phase 3: Lock Level Visualization

```typescript
private formatLockLevelHover(level: string): string {
  const levels = [
    'frozen', 'restricted', 'approval-required', 'tests-required',
    'docs-required', 'review-required', 'normal', 'experimental'
  ];
  
  let content = `**Level:** \`${level}\`\n\n\`\`\`\n`;
  for (const l of levels) {
    const indicator = l === level ? '▓ ← YOU' : '░';
    const bar = '█'.repeat(8 - levels.indexOf(l));
    content += `${l.padEnd(18)} ${bar}${indicator}\n`;
  }
  return content + '```\n';
}
```

### Phase 4: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh hover
```

## Completion Criteria

- [ ] Hover works for all annotation namespaces
- [ ] Lock level visualization displays correctly
- [ ] Variable hover shows expansion preview
- [ ] Symbol hover shows cache data
- [ ] Undefined variables show warning
- [ ] Unit tests pass (run `npm test -- hover`)
- [ ] Latency < 30ms

---
name: project.init
description: Bootstrap the complete acp-lsp project structure with all dependencies, configurations, and scaffolding
version: 1.0.0
category: project
phase: setup
priority: P0
pattern: generator
inputs:
  - project_name: "acp-lsp"
  - sibling_projects: ["acp-spec", "acp-cli"]
outputs:
  - Complete project directory structure
  - package.json with all dependencies
  - TypeScript configuration
  - VS Code extension manifest
  - GitHub Actions CI/CD
handoffs:
  - target: foundation.scaffold
    context: "Project structure created, proceed to server scaffolding"
  - target: project.deps
    context: "Verify sibling project dependencies"
---

# Project Initialization

## Purpose

Bootstrap the complete `acp-lsp` project with production-ready structure, dependencies, and configuration aligned with the ACP ecosystem.

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] pnpm 8+ installed
- [ ] Access to sibling directories: `../acp-spec`, `../acp-cli`

## Workflow

### Phase 1: Create Project Structure

Use templates from `.claude/templates/` to create:

```
acp-lsp/
├── packages/
│   ├── server/           ← templates/server/*
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── capabilities.ts
│   │   │   ├── documents/
│   │   │   ├── providers/
│   │   │   ├── parsers/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── tests/
│   ├── client/
│   │   └── src/extension.ts
│   └── shared/
├── schemas/v1/           ← synced from acp-spec
├── fixtures/
├── docs/
└── scripts/
```

### Phase 2: Copy Templates

```bash
# Copy server templates
cp .claude/templates/server/* packages/server/src/
cp .claude/templates/documents/* packages/server/src/documents/
cp .claude/templates/parsers/* packages/server/src/parsers/
cp .claude/templates/providers/* packages/server/src/providers/
cp .claude/templates/services/* packages/server/src/services/
cp .claude/templates/utils/* packages/server/src/utils/

# Copy test utilities
cp .claude/templates/test/* packages/server/tests/utils/
```

### Phase 3: Sync Schemas

```bash
.claude/scripts/bash/sync-schemas.sh --json
```

### Phase 4: Install Dependencies

```bash
pnpm install
```

### Phase 5: Verify Setup

```bash
pnpm typecheck
pnpm test
```

## Completion Criteria

- [ ] All directories created per structure above
- [ ] All templates copied to correct locations
- [ ] Schemas synced from acp-spec
- [ ] `pnpm install` succeeds
- [ ] `pnpm typecheck` passes
- [ ] Phase status updated in memory

## Handoffs

Upon completion:
1. **`/foundation scaffold`** - Verify server scaffolding
2. **`/project status`** - View project status dashboard

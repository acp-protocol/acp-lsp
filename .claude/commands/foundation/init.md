---
name: init
description: Initialize the ACP LSP project with monorepo structure and dependencies
version: 1.0.0
category: foundation
phase: 1
priority: P0
pattern: generator
inputs:
  - Project name and configuration
  - Target VS Code API version
  - TypeScript configuration preferences
outputs:
  - packages/server/ - LSP server package
  - packages/client/ - VS Code extension package
  - packages/shared/ - Shared types and utilities
  - Root configuration files
handoffs:
  - target: foundation:server
    context: "Project initialized, server package ready for implementation"
---

# Project Initialization

## Purpose

Initialize the ACP LSP monorepo with proper package structure, TypeScript configuration, and development tooling.

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm or pnpm available
- [ ] VS Code installed for testing

## Workflow

### Phase 1: Create Project Structure

```bash
mkdir -p acp-lsp/{packages/{server,client,shared},scripts}
cd acp-lsp
```

### Phase 2: Initialize Root Package

```bash
npm init -y
```

Create `package.json`:
```json
{
  "name": "acp-lsp",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint packages/*/src/**/*.ts",
    "bench": "vitest bench"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

### Phase 3: Initialize Server Package

```bash
cd packages/server
npm init -y
```

Create `packages/server/package.json`:
```json
{
  "name": "@acp-lsp/server",
  "version": "0.1.0",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc -b",
    "watch": "tsc -b -w"
  },
  "dependencies": {
    "vscode-languageserver": "^9.0.0",
    "vscode-languageserver-textdocument": "^1.0.0"
  }
}
```

### Phase 4: Initialize Client Package

```bash
cd packages/client
npm init -y
```

Create `packages/client/package.json`:
```json
{
  "name": "acp-vscode",
  "displayName": "ACP - AI Context Protocol",
  "version": "0.1.0",
  "publisher": "acp-protocol",
  "engines": {
    "vscode": "^1.85.0"
  },
  "activationEvents": [
    "workspaceContains:.acp.config.json",
    "workspaceContains:.acp.cache.json"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "languages": [],
    "configuration": {}
  },
  "dependencies": {
    "vscode-languageclient": "^9.0.0"
  }
}
```

### Phase 5: Create TypeScript Configuration

Create `tsconfig.json` at root:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  },
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/server" },
    { "path": "packages/client" }
  ]
}
```

### Phase 6: Install Dependencies

```bash
npm install
```

## Completion Criteria

- [ ] Monorepo structure created
- [ ] All package.json files valid
- [ ] TypeScript compiles without errors
- [ ] VS Code can open project
- [ ] `npm run build` succeeds

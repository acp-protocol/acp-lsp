---
name: package
description: Package the VS Code extension for marketplace publication
version: 1.0.0
category: polish
phase: 5
priority: P1
pattern: generator
inputs:
  - All providers and services complete
  - Performance optimized
  - Extension manifest
outputs:
  - acp-vscode-x.x.x.vsix
  - Marketplace listing assets
  - README and CHANGELOG
handoffs:
  - target: polish:docs
    context: "Extension packaged, documentation can reference published version"
---

# VS Code Extension Packaging

## Purpose

Package the ACP Language Server as a VS Code extension ready for marketplace publication.

## Prerequisites

- [ ] Performance optimized (`/polish:performance`)
- [ ] All tests passing
- [ ] Extension manifest complete

## Workflow

### Phase 1: Update Extension Manifest

Update `packages/client/package.json`:

```json
{
  "name": "acp-vscode",
  "displayName": "ACP - AI Context Protocol",
  "description": "Language support for AI Context Protocol annotations",
  "version": "0.1.0",
  "publisher": "acp-protocol",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/acp-protocol/acp-lsp"
  },
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Programming Languages",
    "Linters",
    "Other"
  ],
  "keywords": [
    "acp",
    "ai",
    "context",
    "annotations",
    "lsp"
  ],
  "activationEvents": [
    "workspaceContains:.acp.config.json",
    "workspaceContains:.acp.cache.json"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "languages": [
      {
        "id": "acp-config",
        "extensions": [".acp.config.json"],
        "configuration": "./language-configuration.json"
      }
    ],
    "jsonValidation": [
      {
        "fileMatch": ".acp.config.json",
        "url": "./schemas/config.schema.json"
      },
      {
        "fileMatch": ".acp.cache.json",
        "url": "./schemas/cache.schema.json"
      },
      {
        "fileMatch": ".acp.vars.json",
        "url": "./schemas/vars.schema.json"
      }
    ],
    "configuration": {
      "title": "ACP",
      "properties": {
        "acp.trace.server": {
          "type": "string",
          "enum": ["off", "messages", "verbose"],
          "default": "off",
          "description": "Traces communication between VS Code and the ACP language server"
        },
        "acp.inlayHints.showLockLevels": {
          "type": "boolean",
          "default": true,
          "description": "Show lock level indicators"
        },
        "acp.inlayHints.showDomains": {
          "type": "boolean",
          "default": true,
          "description": "Show domain tags"
        }
      }
    },
    "commands": [
      {
        "command": "acp.rebuildCache",
        "title": "ACP: Rebuild Cache"
      },
      {
        "command": "acp.showConstraints",
        "title": "ACP: Show File Constraints"
      }
    ]
  }
}
```

### Phase 2: Create Extension Icon

Create a 128x128 PNG icon at `packages/client/images/icon.png`.

### Phase 3: Write README

Create `packages/client/README.md` with:
- Feature overview
- Installation instructions
- Configuration options
- Screenshots
- Links to documentation

### Phase 4: Generate CHANGELOG

Create `packages/client/CHANGELOG.md` with release notes.

### Phase 5: Build and Package

```bash
cd packages/client
npm run build
npx vsce package
```

### Phase 6: Validate Package

```bash
npx vsce ls
# Verify included files
```

## Completion Criteria

- [ ] Manifest has all required fields
- [ ] Icon created and referenced
- [ ] README comprehensive
- [ ] CHANGELOG up to date
- [ ] Package builds without warnings
- [ ] VSIX file created
- [ ] Extension installs from VSIX
- [ ] All features work in installed extension

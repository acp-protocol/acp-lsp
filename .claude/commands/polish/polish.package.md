---
name: polish.package
description: Package the extension for VS Code Marketplace and VSIX distribution
version: 1.0.0
category: polish
phase: 5
priority: P0
pattern: orchestrator
inputs:
  - Completed extension code
  - Documentation
  - Test results
outputs:
  - acp-lsp-x.x.x.vsix
  - Marketplace listing
handoffs:
  - target: polish.release
    context: "Package built, ready for release"
---

# Extension Packaging

## Purpose

Package the ACP Language Server extension for distribution via VS Code Marketplace and direct VSIX download.

## Prerequisites

- [ ] All tests pass
- [ ] Coverage targets met
- [ ] Documentation complete
- [ ] Changelog updated

## Workflow

### Phase 1: Pre-packaging Validation

```bash
# Run full test suite
pnpm test

# Verify coverage
pnpm test:coverage

# TypeScript check
pnpm typecheck

# Lint
pnpm lint
```

### Phase 2: Update Version

```bash
# Update version in all package.json files
pnpm version patch|minor|major

# Update CHANGELOG.md
```

### Phase 3: Build Extension

```bash
cd packages/client

# Install vsce
pnpm add -D @vscode/vsce

# Build VSIX
pnpm exec vsce package --out ../../dist/acp-lsp-$(cat package.json | jq -r .version).vsix
```

### Phase 4: Package Contents Verification

The VSIX should contain:

```
extension/
├── package.json          # Extension manifest
├── README.md            # Marketplace readme
├── CHANGELOG.md         # Version history
├── LICENSE              # MIT license
├── dist/
│   ├── extension.js     # Client bundle
│   └── server/          # Server bundle
├── schemas/             # JSON schemas
└── images/
    ├── icon.png         # 128x128 icon
    └── preview.png      # Marketplace preview
```

### Phase 5: VS Code Marketplace Publishing

```bash
# Login to marketplace (first time)
pnpm exec vsce login acp-protocol

# Publish
pnpm exec vsce publish
```

### Phase 6: GitHub Release

Create GitHub release with:
- Tag: `v${version}`
- Title: `ACP Language Server v${version}`
- Body: Changelog excerpt
- Assets: VSIX file

## Extension Manifest (package.json)

```json
{
  "name": "acp-lsp",
  "displayName": "ACP - AI Context Protocol",
  "description": "Language support for ACP annotations",
  "version": "0.1.0",
  "publisher": "acp-protocol",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Programming Languages", "Linters"],
  "activationEvents": ["onLanguage:typescript", "onLanguage:javascript", "workspaceContains:**/.acp.config.json"],
  "main": "./dist/extension.js",
  "contributes": {
    "languages": [{
      "id": "acp-json",
      "aliases": ["ACP Configuration"],
      "filenames": [".acp.config.json", ".acp.vars.json", ".acp.cache.json"]
    }],
    "configuration": {
      "title": "ACP",
      "properties": {
        "acp.enable": {
          "type": "boolean",
          "default": true,
          "description": "Enable ACP language features"
        },
        "acp.validation.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable annotation validation"
        }
      }
    }
  }
}
```

## Distribution Channels

| Channel | Status | Notes |
|---------|--------|-------|
| VS Code Marketplace | Primary | Main distribution |
| VSIX Direct | Secondary | GitHub releases |
| Open VSX | Future | Open source registry |

## Completion Criteria

- [ ] VSIX builds without errors
- [ ] Package contains all required files
- [ ] Extension installs correctly
- [ ] All features work after install
- [ ] Marketplace listing updated

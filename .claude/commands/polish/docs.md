---
name: docs
description: Create comprehensive documentation for the ACP LSP extension
version: 1.0.0
category: polish
phase: 5
priority: P1
pattern: generator
inputs:
  - Extension features
  - Configuration options
  - Error codes
outputs:
  - docs/README.md
  - docs/configuration.md
  - docs/features.md
  - docs/troubleshooting.md
handoffs:
  - target: review:phase
    context: "Documentation complete, Phase 5 ready for final review"
---

# Documentation Generation

## Purpose

Create comprehensive user-facing documentation for the ACP VS Code extension.

## Prerequisites

- [ ] Extension packaged (`/polish:package`)
- [ ] All features finalized

## Workflow

### Phase 1: Create Documentation Structure

```bash
mkdir -p docs/{guides,reference,images}
```

### Phase 2: Write Main README

Create `docs/README.md`:

```markdown
# ACP Language Server for VS Code

Language support for AI Context Protocol (ACP) annotations in your codebase.

## Features

- **Syntax Highlighting** - ACP annotations highlighted in comments
- **Completions** - Smart completions for namespaces, values, and variables
- **Hover Information** - Rich documentation on hover
- **Diagnostics** - Real-time validation of annotations
- **Go to Definition** - Navigate to variable definitions
- **Find References** - Find all usages of variables and symbols
- **Code Actions** - Quick fixes for common issues
- **Code Lens** - Inline constraint and usage information

## Quick Start

1. Install the extension from the VS Code Marketplace
2. Open a project with `.acp.config.json` or `.acp.cache.json`
3. The extension activates automatically

## Supported Languages

- TypeScript / JavaScript
- Python
- Rust
- Go
- Java / C# / C++

## Documentation

- [Configuration Guide](./configuration.md)
- [Features Overview](./features.md)
- [Troubleshooting](./troubleshooting.md)
- [Error Reference](./reference/errors.md)
```

### Phase 3: Write Configuration Guide

Create `docs/configuration.md` with all settings.

### Phase 4: Write Features Guide

Create `docs/features.md` with screenshots and examples.

### Phase 5: Write Error Reference

Create `docs/reference/errors.md`:

```markdown
# Error Reference

## Syntax Errors (E1xx)

| Code | Message | Fix |
|------|---------|-----|
| E100 | Malformed annotation syntax | Check @acp:namespace value format |
| E101 | Unknown namespace | Use valid namespace from list |
| E102 | Invalid lock level | Use valid lock level |
| E103 | Invalid domain name format | Use alphanumeric with hyphens |
| E104 | Malformed variable reference | Use $PREFIX_NAME format |
| E105 | Undefined variable | Define in .acp.vars.json |

## Structural Errors (E2xx)

| Code | Message | Fix |
|------|---------|-----|
| E200 | Missing required field | Add required field to JSON |
| E201 | Missing directive separator | Add " - " after value |
| E202 | Empty directive after separator | Add directive text |

## Warnings (W0xx)

| Code | Message | Fix |
|------|---------|-----|
| W001 | Orphaned annotation | Move annotation or remove |
| W010 | Cache may be stale | Run `acp index` |
| W011 | Hack annotation expired | Address the hack |
```

### Phase 6: Capture Screenshots

Capture screenshots for:
- Completion popup
- Hover information
- Diagnostics in editor
- Code lens display
- Quick fix menu

### Phase 7: Validate Documentation

- Check all links work
- Verify screenshots are current
- Test code examples

## Completion Criteria

- [ ] README provides quick start
- [ ] Configuration fully documented
- [ ] All features documented with examples
- [ ] Error codes documented
- [ ] Screenshots current and clear
- [ ] All links valid
- [ ] Spell-checked and proofread

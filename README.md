# ACP Language Server (acp-lsp)

Language Server Protocol implementation for the AI Context Protocol (ACP).

## Overview

This project provides IDE support for ACP annotations and configuration, including:

- **Syntax validation** for ACP annotations
- **Schema validation** for `.acp.config.json` and `.acp.cache.json` files
- **Intelligent completions** for annotation types and values
- **Hover information** for annotations and configuration
- **Diagnostics** for common issues

## Project Structure

```
acp-lsp/
├── packages/
│   ├── server/     # Language server core
│   ├── client/     # VS Code extension
│   └── shared/     # Shared types and utilities
├── schemas/        # ACP JSON schemas (synced from acp-spec)
├── fixtures/       # Test fixtures
└── scripts/        # Build and utility scripts
```

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Install dependencies
pnpm install

# Sync schemas from acp-spec
pnpm sync:schemas

# Build all packages
pnpm build
```

### Commands

```bash
# Development mode (watch)
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Package VS Code extension
pnpm package:vsix
```

### Testing in VS Code

1. Open the project in VS Code
2. Press F5 to launch the Extension Development Host
3. Open a project with ACP annotations to test

## Architecture

The language server follows a standard LSP architecture:

- **Server** (`packages/server`): Implements LSP protocol, annotation parsing, and validation
- **Client** (`packages/client`): VS Code extension that manages the server lifecycle
- **Shared** (`packages/shared`): Common types, constants, and utilities

## License

MIT
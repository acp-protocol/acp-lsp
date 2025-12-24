# ACP LSP Project Context

**Last Updated**: {{DATE}}
**Status**: Active Development

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | acp-lsp |
| **Display Name** | ACP - AI Context Protocol |
| **Description** | Language Server Protocol implementation for ACP |
| **Version** | 0.1.0-dev |
| **Repository** | https://github.com/acp-protocol/acp-lsp |

## Technical Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 18.x / 20.x |
| Language | TypeScript | 5.3.x |
| Package Manager | pnpm | 8.x |
| Test Runner | Vitest | 1.x |
| LSP Library | vscode-languageserver | 9.x |

## Project Structure

```
acp-lsp/
├── packages/
│   ├── server/           # Language server core
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── capabilities.ts
│   │   │   ├── documents/
│   │   │   ├── providers/
│   │   │   ├── parsers/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── tests/
│   ├── client/           # VS Code extension
│   └── shared/           # Shared types
├── schemas/v1/           # Synced from acp-spec
├── fixtures/             # Test fixtures
└── docs/                 # Documentation
```

## Sibling Projects

| Project | Path | Integration |
|---------|------|-------------|
| acp-spec | `../acp-spec` | Schemas, grammar |
| acp-cli | `../acp-cli` | Reference parsers |
| acp-daemon | `../acp-daemon` | Future cache sync |
| acp-mcp | `../acp-mcp` | MCP reference |

## Distribution Targets

| Platform | Status | Notes |
|----------|--------|-------|
| VS Code Marketplace | Planned | Primary |
| VSIX | Planned | Direct download |
| JetBrains | Future | Post v1.0 |

## Key Decisions

### D-001: TypeScript First
- **Decision**: Implement in TypeScript before Rust
- **Rationale**: Faster iteration, easier debugging
- **Date**: {{DATE}}

### D-002: Vitest for Testing
- **Decision**: Use Vitest instead of Jest
- **Rationale**: Modern, fast, good TypeScript support
- **Date**: {{DATE}}

### D-003: Monorepo Structure
- **Decision**: pnpm workspace with server/client separation
- **Rationale**: Clean separation, shared types
- **Date**: {{DATE}}

## Stakeholders

| Role | Interest |
|------|----------|
| Developers | Primary users of IDE extension |
| AI Tool Vendors | Integration targets |
| ACP Maintainers | Spec alignment |

# Assumptions Log

**Last Updated**: {{DATE}}

## Active Assumptions

### A-001: LSP 3.17 Compatibility
- **Status**: Active
- **Category**: Technical
- **Statement**: vscode-languageserver v9.x provides full LSP 3.17 compatibility
- **Validation**: Check LSP spec changelog
- **Risk if Wrong**: Medium - may need to implement workarounds
- **Review Date**: Phase 1 completion

### A-002: Regex Parsing Sufficient for MVP
- **Status**: Active
- **Category**: Technical
- **Statement**: Regex-based annotation parsing is sufficient for MVP performance
- **Validation**: Benchmark against tree-sitter
- **Risk if Wrong**: Medium - may need to switch to tree-sitter
- **Review Date**: Phase 2 completion

### A-003: Bundled Schemas Acceptable
- **Status**: Active
- **Category**: Technical
- **Statement**: Bundling schemas in extension is acceptable vs. dynamic fetch
- **Validation**: Confirm with stakeholders
- **Risk if Wrong**: Low - easy to change
- **Review Date**: Phase 1 start

### A-004: Incremental Sync Performance
- **Status**: Active
- **Category**: Technical
- **Statement**: Incremental document sync is sufficient without full re-parse
- **Validation**: Performance testing with large files
- **Risk if Wrong**: Medium - may need optimization
- **Review Date**: Phase 2 completion

### A-005: Single Language Server
- **Status**: Active
- **Category**: Architecture
- **Statement**: One server instance per workspace is sufficient
- **Validation**: Monitor memory usage
- **Risk if Wrong**: Low - can scale if needed
- **Review Date**: Phase 5 start

### A-006: VS Code Primary Target
- **Status**: Confirmed
- **Category**: Product
- **Statement**: VS Code is the primary IDE target for v1.0
- **Validation**: Confirmed with stakeholders
- **Risk if Wrong**: N/A - confirmed
- **Confirmed Date**: {{DATE}}

### A-007: TypeScript-First Implementation
- **Status**: Confirmed
- **Category**: Technical
- **Statement**: Implement in TypeScript before considering Rust port
- **Validation**: Decision made
- **Risk if Wrong**: N/A - confirmed
- **Confirmed Date**: {{DATE}}

### A-008: Sibling Project Availability
- **Status**: Active
- **Category**: Dependencies
- **Statement**: acp-spec and acp-cli are available as sibling directories
- **Validation**: CI environment setup
- **Risk if Wrong**: High - schemas unavailable
- **Review Date**: CI setup

### A-009: pnpm Workspace Structure
- **Status**: Confirmed
- **Category**: Technical
- **Statement**: Use pnpm workspaces for monorepo
- **Validation**: Decision made
- **Risk if Wrong**: N/A - confirmed
- **Confirmed Date**: {{DATE}}

### A-010: 20-Week Timeline
- **Status**: Active
- **Category**: Schedule
- **Statement**: 20-week development timeline is achievable
- **Validation**: Track velocity
- **Risk if Wrong**: Medium - may need scope adjustment
- **Review Date**: Weekly

---

## Retired Assumptions

*None yet*

---

## Review Schedule

| Assumption | Next Review |
|------------|-------------|
| A-001 | Phase 1 gate |
| A-002 | Phase 2 gate |
| A-004 | Phase 2 gate |
| A-005 | Phase 5 start |
| A-008 | CI setup |
| A-010 | Weekly |

# ACP LSP SpecKit

A complete Claude Code automation package for building the ACP Language Server Protocol implementation. This SpecKit transforms the [ACP LSP Requirements Specification](./acp-lsp-requirements.md) into executable commands that guide Claude through the entire 20-week implementation.

## Overview

The SpecKit contains **24 commands**, **8 scripts**, and **7 templates** organized into a 5-phase implementation plan. Each command includes prerequisites, implementation steps with code samples, validation criteria, and handoffs to the next command.

## Quick Start

```bash
# Extract into your project
unzip acp-lsp-speckit-complete.zip -d your-project/

# Start with Phase 1
# In Claude Code, type:
/foundation:init
```

## Structure

```
.claude/
├── commands/
│   ├── foundation/      # Phase 1: Project setup and core infrastructure
│   ├── intelligence/    # Phase 2: Parsers, completions, hover
│   ├── navigation/      # Phase 3: Go to definition, references, symbols
│   ├── advanced/        # Phase 4: Code actions, semantic tokens, lens
│   ├── polish/          # Phase 5: Performance, packaging, docs
│   ├── test/            # Testing commands (run per phase)
│   └── review/          # Phase gate reviews
├── scripts/bash/        # Supporting automation scripts
└── templates/           # TypeScript templates for providers/services
```

---

## Command Reference

### Phase 1: Foundation (Weeks 1-4)

| Order  | Command                   | Description                                                                                                                                  |
|--------|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | `/foundation:init`        | Initialize monorepo with packages/server, packages/client, packages/shared. Sets up TypeScript, ESLint, Vitest, and workspace configuration. |
| 2      | `/foundation:server`      | Implement core LSP server with initialization, capability negotiation, and connection lifecycle. Declares all LSP capabilities.              |
| 3      | `/foundation:documents`   | Implement document manager for text synchronization, change tracking, and document lifecycle events.                                         |
| 4      | `/foundation:schema`      | Implement JSON schema validator using Ajv for .acp.config.json, .acp.cache.json, .acp.vars.json, and .acp.sync.json.                         |
| 5      | `/foundation:diagnostics` | Implement diagnostic provider that aggregates validation errors and publishes them with proper error codes (E1xx, E2xx, W0xx).               |

**Phase 1 Exit Criteria:**
- Server starts and completes LSP handshake
- Documents tracked on open/change/close
- Schema validation produces accurate diagnostics
- All error codes from Section 12 mapped

---

### Phase 2: Core Intelligence (Weeks 5-8)

| Order   | Command                     | Description                                                                                                                                                                                           |
|---------|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 6       | `/intelligence:parsers`     | Implement annotation parsers for TypeScript, JavaScript, Python, Rust, Go, and Java/C#/C++. Extracts @acp: annotations from comments using EBNF grammar.                                              |
| 7       | `/intelligence:completions` | Implement completion provider with namespace suggestions, lock level completions, domain completions from cache, and variable completions. Handles trigger characters @, :, $, .                      |
| 8       | `/intelligence:hover`       | Implement hover provider showing rich documentation for annotations, lock level visualizations, variable expansion previews, and symbol metadata from cache.                                          |
| 9       | `/intelligence:variables`   | Implement variable resolution service for $SYM_, $FILE_, $DOM_ references. Includes circular reference detection (max depth 10), modifier application (.full, .ref, .signature), and escape handling. |

**Phase 2 Exit Criteria:**
- All 6 language parsers extract annotations correctly
- Completions appear for all contexts
- Hover shows formatted documentation
- Variables resolve with all modifiers
- Parser tests at 95% coverage

---

### Phase 3: Navigation (Weeks 9-12)

| Order   | Command                  | Description                                                                                                                                          |
|---------|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| 10      | `/navigation:definition` | Implement Go to Definition (F12) for variables → .acp.vars.json, symbols → source file, domains → config/cache, and @acp:ref URLs → browser.         |
| 11      | `/navigation:references` | Implement Find All References (Shift+F12) using cache call graph. Finds variable usages, symbol callers, domain files/symbols, and lock level files. |
| 12      | `/navigation:symbols`    | Implement Document Symbols (Ctrl+Shift+O) and Workspace Symbols (Ctrl+T). Supports query patterns like @domain:auth, @lock:frozen, #symbolName.      |
| 13      | `/navigation:cache`      | Enhance cache service with staleness detection, call graph navigation (getCallers/getCallees/getCallHierarchy), file watching, and lazy loading.     |

**Phase 3 Exit Criteria:**
- F12 navigates to all definition types
- Shift+F12 finds all references
- Symbol search works with query patterns
- Cache staleness detected accurately
- Integration tests pass

---

### Phase 4: Advanced Features (Weeks 13-16)

| Order  | Command              | Description                                                                                                                                                                                   |
|--------|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 14     | `/advanced:actions`  | Implement Code Actions (lightbulb menu) with quick fixes for all diagnostic codes, refactoring actions (extract variable, change lock level), and source actions (generate/sort annotations). |
| 15     | `/advanced:semantic` | Implement Semantic Tokens for syntax highlighting. Token types: acp-prefix, acp-namespace, acp-value, acp-directive, acp-variable, acp-modifier. Includes delta support for performance.      |
| 16     | `/advanced:lens`     | Implement Code Lens showing constraint indicators (🔒 frozen), caller counts (→ 5 callers), variable usages (⟲ 8 usages), and expired hack warnings. Uses lazy resolution.                    |
| 17     | `/advanced:inlay`    | Implement Inlay Hints for variable expansion previews, lock level indicators at file start, domain tags, and constraint inheritance markers. Configurable via settings.                       |

**Phase 4 Exit Criteria:**
- Quick fixes work for all diagnostic types
- Semantic highlighting enhances readability
- Code lens shows useful inline information
- Inlay hints configurable and performant
- All advanced features have tests

---

### Phase 5: Polish & Ship (Weeks 17-20)

| Order   | Command               | Description                                                                                                                                                                       |
|---------|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 18      | `/polish:performance` | Analyze and optimize performance to meet latency targets. Implements incremental parsing, LRU caching (1000 items), debouncing (100ms), lazy loading, and request cancellation.   |
| 19      | `/polish:package`     | Package VS Code extension with complete manifest, icon, README, CHANGELOG. Generates .vsix file ready for marketplace publication.                                                |
| 20      | `/polish:docs`        | Create comprehensive documentation including quick start guide, configuration reference, feature documentation with screenshots, error code reference, and troubleshooting guide. |

**Phase 5 Exit Criteria:**
- All latency targets met (see Performance Targets below)
- Extension installs and works from .vsix
- Documentation complete and accurate
- Ready for marketplace submission

---

### Testing Commands

| Command             | Description                                                                                                                                                | When to Run                 |
|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------|
| `/test:unit`        | Generate unit tests for providers and services. Coverage targets: parsers 95%, services 90%, providers 85%. Creates test fixtures for valid/invalid cases. | After each phase            |
| `/test:integration` | Generate integration tests for LSP client-server communication. Tests document lifecycle, completions, navigation, and cross-provider interactions.        | After Phase 3, 4, 5         |
| `/test:performance` | Generate performance benchmarks for all LSP operations. Creates benchmark harness and baseline measurements.                                               | Before Phase 5 optimization |

---

### Review Command

| Command         | Description                                                                                                                                            | When to Run       |
|-----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| `/review:phase` | Conduct phase gate review. Verifies all deliverables exist, tests pass with required coverage, and generates go/no-go report. Usage: `/review:phase 1` | End of each phase |

---

## Execution Order

### Complete Sequence

```
# Phase 1: Foundation
/foundation:init
/foundation:server
/foundation:documents
/foundation:schema
/foundation:diagnostics
/test:unit
/review:phase 1

# Phase 2: Core Intelligence
/intelligence:parsers
/intelligence:completions
/intelligence:hover
/intelligence:variables
/test:unit
/review:phase 2

# Phase 3: Navigation
/navigation:definition
/navigation:references
/navigation:symbols
/navigation:cache
/test:unit
/test:integration
/review:phase 3

# Phase 4: Advanced Features
/advanced:actions
/advanced:semantic
/advanced:lens
/advanced:inlay
/test:unit
/test:integration
/review:phase 4

# Phase 5: Polish & Ship
/test:performance
/polish:performance
/polish:package
/polish:docs
/test:integration
/review:phase 5
```

### Handoff Chain Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1                                                                     │
│ init → server → documents → schema → diagnostics ──────────────────────────┐│
└────────────────────────────────────────────────────────────────────────────┘│
                                                                              │
┌────────────────────────────────────────────────────────────────────────────┐│
│ PHASE 2                                                          ◄─────────┘│
│ parsers → completions → hover → variables ─────────────────────────────────┐│
└────────────────────────────────────────────────────────────────────────────┘│
                                                                              │
┌────────────────────────────────────────────────────────────────────────────┐│
│ PHASE 3                                                          ◄─────────┘│
│ definition → references → symbols → cache ─────────────────────────────────┐│
└────────────────────────────────────────────────────────────────────────────┘│
                                                                              │
┌────────────────────────────────────────────────────────────────────────────┐│
│ PHASE 4                                                          ◄─────────┘│
│ actions → semantic → lens → inlay ─────────────────────────────────────────┐│
└────────────────────────────────────────────────────────────────────────────┘│
                                                                              │
┌────────────────────────────────────────────────────────────────────────────┐│
│ PHASE 5                                                          ◄─────────┘│
│ test:performance → polish:performance → polish:package → polish:docs        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Scripts Reference

| Script                 | Description                                | Usage                                         |
|------------------------|--------------------------------------------|-----------------------------------------------|
| `generate-provider.sh` | Generate a provider from template          | `./scripts/bash/generate-provider.sh hover`   |
| `generate-service.sh`  | Generate a service from template           | `./scripts/bash/generate-service.sh variable` |
| `validate-provider.sh` | Validate provider implementation           | `./scripts/bash/validate-provider.sh hover`   |
| `validate-service.sh`  | Validate service implementation            | `./scripts/bash/validate-service.sh cache`    |
| `generate-tests.sh`    | Generate test files or integration harness | `./scripts/bash/generate-tests.sh hover`      |
| `check-coverage.sh`    | Check test coverage against targets        | `./scripts/bash/check-coverage.sh`            |
| `run-benchmarks.sh`    | Run performance benchmarks                 | `./scripts/bash/run-benchmarks.sh`            |
| `review-phase.sh`      | Conduct phase gate review                  | `./scripts/bash/review-phase.sh 1`            |

---

## Templates Reference

| Template                    | Description                                  | Location               |
|-----------------------------|----------------------------------------------|------------------------|
| `hover.ts.template`         | Hover provider with lock level visualization | `templates/providers/` |
| `completion.ts.template`    | Completion provider with all contexts        | `templates/providers/` |
| `definition.ts.template`    | Go to Definition provider                    | `templates/providers/` |
| `variable.ts.template`      | Variable resolution service                  | `templates/services/`  |
| `cache.ts.template`         | Cache integration service                    | `templates/services/`  |
| `provider.test.ts.template` | Unit test template for providers             | `templates/test/`      |
| `service.test.ts.template`  | Unit test template for services              | `templates/test/`      |

---

## Performance Targets

From ACP LSP Requirements Section 17:

| Operation                 | Target   | Maximum   |
|---------------------------|----------|-----------|
| Diagnostics (incremental) | < 50ms   | 100ms     |
| Diagnostics (full file)   | < 200ms  | 500ms     |
| Completions               | < 30ms   | 50ms      |
| Hover                     | < 20ms   | 30ms      |
| Go to Definition          | < 50ms   | 100ms     |
| Find References           | < 100ms  | 300ms     |
| Semantic Tokens           | < 100ms  | 200ms     |
| Code Lens                 | < 100ms  | 200ms     |

**Resource Limits:**
- Memory: < 200MB for 100K LOC project
- CPU: < 5% idle, < 30% during indexing

---

## Error Codes

### Syntax Errors (E1xx)

| Code  | Message                      |
|-------|------------------------------|
| E100  | Malformed annotation syntax  |
| E101  | Unknown namespace            |
| E102  | Invalid lock level           |
| E103  | Invalid domain name format   |
| E104  | Malformed variable reference |
| E105  | Undefined variable           |

### Structural Errors (E2xx)

| Code  | Message                         |
|-------|---------------------------------|
| E200  | Missing required field          |
| E201  | Missing directive separator     |
| E202  | Empty directive after separator |

### Warnings (W0xx)

| Code   | Message                 |
|--------|-------------------------|
| W001   | Orphaned annotation     |
| W010   | Cache may be stale      |
| W011   | Hack annotation expired |

---

## Lock Level Hierarchy

From most restrictive to least restrictive:

1. **frozen** - AI MUST NOT modify under any circumstances
2. **restricted** - AI MUST explain changes and get approval first
3. **approval-required** - AI SHOULD ask for approval for significant changes
4. **tests-required** - AI MUST include tests with any changes
5. **docs-required** - AI MUST update documentation with changes
6. **review-required** - Changes require code review
7. **normal** - AI may modify freely (default)
8. **experimental** - AI may modify aggressively for experimentation

---

## Variable Patterns

| Prefix   | Type             | Example                 |
|----------|------------------|-------------------------|
| `$SYM_`  | Symbol reference | `$SYM_VALIDATE_SESSION` |
| `$FILE_` | File reference   | `$FILE_AUTH_SERVICE`    |
| `$DOM_`  | Domain reference | `$DOM_AUTHENTICATION`   |

### Modifiers

| Modifier     | Description                   |
|--------------|-------------------------------|
| `.full`      | Complete JSON representation  |
| `.ref`       | File path and line reference  |
| `.signature` | Type signature (symbols only) |

---

## Requirements Traceability

This SpecKit implements all 20 sections of the ACP LSP Requirements Specification:

| Section  | Requirement            | Commands                 |
|----------|------------------------|--------------------------|
| 1-3      | Overview, Goals, Scope | All                      |
| 4        | File Types             | foundation:schema        |
| 5        | Annotation Syntax      | intelligence:parsers     |
| 6        | Diagnostics            | foundation:diagnostics   |
| 7        | Completions            | intelligence:completions |
| 8        | Hover                  | intelligence:hover       |
| 9        | Navigation             | navigation:*             |
| 10       | Code Actions           | advanced:actions         |
| 11       | Semantic Tokens        | advanced:semantic        |
| 12       | Error Codes            | foundation:diagnostics   |
| 13       | Code Lens              | advanced:lens            |
| 14       | Inlay Hints            | advanced:inlay           |
| 15       | Configuration          | polish:package           |
| 16       | Extension Points       | polish:package           |
| 17       | Performance            | polish:performance       |
| 18       | Testing                | test:*                   |
| 19       | Packaging              | polish:package           |
| 20       | Documentation          | polish:docs              |

---

## License

Apache-2.0 - See [LICENSE](./LICENSE) for details.

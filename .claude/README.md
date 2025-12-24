# ACP LSP SpecKit

Complete Claude Code automation package for building the ACP Language Server Protocol implementation.

## Quick Start

```bash
# 1. Initialize project
/project init

# 2. Check status
/project status

# 3. Start with foundation phase
/foundation scaffold
```

## Package Contents

### Commands (11)

| Command                     | Phase   | Description                          |
|-----------------------------|---------|--------------------------------------|
| `/project init`             | Setup   | Bootstrap complete project structure |
| `/project status`           | All     | View project status dashboard        |
| `/foundation scaffold`      | 1       | Create LSP server scaffolding        |
| `/foundation documents`     | 1       | Implement document synchronization   |
| `/foundation parser`        | 1       | Annotation parsing for TS/JS         |
| `/foundation schemas`       | 1       | JSON schema validation               |
| `/intelligence completions` | 2       | Context-aware completions            |
| `/test plan`                | All     | Generate test plan with traceability |
| `/test fixtures`            | All     | Generate test fixtures               |
| `/review phase`             | All     | Phase gate verification              |
| `/polish package`           | 5       | Multi-platform packaging             |

### Templates (10)

| Template                       | Purpose                            |
|--------------------------------|------------------------------------|
| `server/server.ts`             | Main LSP server entry point        |
| `server/capabilities.ts`       | LSP capability declaration         |
| `documents/manager.ts`         | Document metadata management       |
| `documents/sync.ts`            | Document lifecycle with debouncing |
| `parsers/annotation-parser.ts` | ACP annotation extraction          |
| `providers/diagnostics.ts`     | Validation result publishing       |
| `providers/completion.ts`      | Context-aware completions          |
| `providers/hover.ts`           | Hover documentation                |
| `services/configuration.ts`    | Settings management                |
| `services/schema-validator.ts` | JSON schema validation             |
| `utils/logger.ts`              | Structured logging                 |
| `test/mocks.ts`                | Test utilities and fixtures        |

### Scripts (3)

| Script                      | Purpose                    |
|-----------------------------|----------------------------|
| `check-phase-completion.sh` | Verify phase deliverables  |
| `sync-schemas.sh`           | Sync schemas from acp-spec |
| `validate-speckit.sh`       | Validate package structure |

All scripts support `--json` output for machine parsing.

### Memory Files (4)

| File                 | Purpose                             |
|----------------------|-------------------------------------|
| `project-context.md` | Project identity and configuration  |
| `phase-status.md`    | Phase progress tracking             |
| `assumptions-log.md` | Tracked assumptions with validation |
| `sibling-deps.md`    | Sibling project dependencies        |

## Directory Structure

```
.claude/
├── commands/
│   ├── project/           # Project management
│   ├── foundation/        # Phase 1: Foundation
│   ├── intelligence/      # Phase 2: Core Intelligence
│   ├── navigation/        # Phase 3: Navigation
│   ├── advanced/          # Phase 4: Advanced Features
│   ├── polish/            # Phase 5: Polish
│   ├── test/              # Testing commands
│   └── review/            # Review commands
├── scripts/
│   └── bash/              # Shell scripts with --json support
├── templates/
│   ├── server/            # Server entry point
│   ├── documents/         # Document management
│   ├── parsers/           # Annotation parsing
│   ├── providers/         # LSP providers
│   ├── services/          # Core services
│   ├── utils/             # Utilities
│   └── test/              # Test utilities
└── memory/                # Persistent project state
```

## Development Phases

| Phase           | Weeks   | Focus                                  |
|-----------------|---------|----------------------------------------|
| 1. Foundation   | 1-4     | Server, docs, parsing, schemas         |
| 2. Intelligence | 5-8     | 8 language parsers, completions, hover |
| 3. Navigation   | 9-12    | Definition, references, symbols        |
| 4. Advanced     | 13-16   | Code actions, semantic tokens          |
| 5. Polish       | 17-20   | Performance, packaging, publishing     |

## Key Decisions

| ID    | Decision           | Rationale                          |
|-------|--------------------|------------------------------------|
| D-001 | TypeScript-first   | Faster iteration, easier debugging |
| D-002 | Vitest testing     | Modern, fast, good TS support      |
| D-003 | Monorepo structure | Clean server/client separation     |

## Requirements Traceability

Commands trace to requirements in `../acp-lsp-requirements.md`.
Phase gates ensure systematic requirement coverage.

## Usage Pattern

1. **Initialize**: `/project init` creates structure
2. **Develop**: Run phase-specific commands
3. **Validate**: `/review phase` checks gates
4. **Iterate**: Address blockers, continue

## Generated by SpecKit

This package was generated using the SpecKit methodology from requirements.
See `speckit-deliverable-principles.md` for INCOSE-aligned deliverable standards.

# Sibling Project Dependencies

**Last Updated**: {{DATE}}

## Overview

The acp-lsp project depends on artifacts from sibling repositories in the ACP ecosystem.

## acp-spec (REQUIRED)

**Path**: `../acp-spec`
**Repository**: https://github.com/acp-protocol/acp-spec

### Required Artifacts

| Artifact | Path | Usage |
|----------|------|-------|
| Config Schema | `schemas/v1/config.schema.json` | Validate .acp.config.json |
| Cache Schema | `schemas/v1/cache.schema.json` | Validate .acp.cache.json |
| Vars Schema | `schemas/v1/vars.schema.json` | Validate .acp.vars.json |
| Attempts Schema | `schemas/v1/attempts.schema.json` | Validate acp.attempts.json |
| Sync Schema | `schemas/v1/sync.schema.json` | Validate acp.sync.json |
| Primer Schema | `schemas/v1/primer.schema.json` | Validate primer files |
| EBNF Grammar | `spec/grammar/acp.ebnf` | Parser reference |

### Sync Command

```bash
.claude/scripts/bash/sync-schemas.sh
```

### Integration Notes

- Schemas should be synced before release
- Watch for breaking changes in schema versions
- Grammar changes may require parser updates

---

## acp-cli (REFERENCE)

**Path**: `../acp-cli`
**Repository**: https://github.com/acp-protocol/acp-cli

### Reference Artifacts

| Artifact | Path | Usage |
|----------|------|-------|
| Rust Parsers | `src/ast/languages/` | Reference implementation |
| Test Fixtures | `tests/fixtures/` | Share test cases |

### Integration Notes

- Can reference parser logic but not directly import
- Fixture sharing is optional but recommended
- Performance benchmarks can compare implementations

---

## acp-mcp (REFERENCE)

**Path**: `../acp-mcp`
**Repository**: https://github.com/acp-protocol/acp-mcp

### Reference Artifacts

| Artifact | Path | Usage |
|----------|------|-------|
| Primer Templates | `primers/` | Reference format |

### Integration Notes

- Primer format alignment important
- Future: may integrate primer generation

---

## acp-daemon (FUTURE)

**Path**: `../acp-daemon`
**Repository**: https://github.com/acp-protocol/acp-daemon

### Future Integration

| Feature | Status | Notes |
|---------|--------|-------|
| Cache sync | Planned | Real-time cache updates |
| File watching | Planned | Delegate to daemon |
| Multi-tool coordination | Planned | Share state |

---

## Dependency Matrix

| Project | acp-lsp Depends On | Notes |
|---------|-------------------|-------|
| acp-spec | **REQUIRED** | Schemas, grammar |
| acp-cli | Optional | Reference only |
| acp-mcp | Optional | Primer reference |
| acp-daemon | Future | v2.0 integration |

---

## CI/CD Considerations

1. **Clone siblings in CI**:
   ```yaml
   - uses: actions/checkout@v4
     with:
       repository: acp-protocol/acp-spec
       path: acp-spec
   ```

2. **Validate schema sync before release**

3. **Track upstream changes with dependabot or similar**

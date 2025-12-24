---
name: test.plan
description: Generate comprehensive test plan with requirement traceability
version: 1.0.0
category: test
phase: all
priority: P0
pattern: generator
inputs:
  - LSP requirements specification
  - Phase deliverables
outputs:
  - docs/test-plan.md
  - Test case inventory
handoffs:
  - target: test.unit
    context: "Test plan complete, generate unit tests"
  - target: test.integration
    context: "Test plan complete, generate integration tests"
---

# Test Plan Generation

## Purpose

Generate comprehensive test plan covering all LSP features with requirement traceability.

## Test Categories

### Unit Tests
Location: `packages/server/tests/unit/`

| Component | Test File | Coverage Target |
|-----------|-----------|-----------------|
| SchemaValidator | schema-validator.test.ts | 90% |
| AnnotationParser | annotation-parser.test.ts | 90% |
| CompletionProvider | completion-provider.test.ts | 85% |
| HoverProvider | hover-provider.test.ts | 85% |
| DiagnosticsProvider | diagnostics-provider.test.ts | 85% |
| DocumentManager | document-manager.test.ts | 80% |

### Integration Tests
Location: `packages/server/tests/integration/`

| Test Suite | Description |
|------------|-------------|
| server-lifecycle.test.ts | Initialize/shutdown |
| document-sync.test.ts | Open/change/close |
| diagnostics-flow.test.ts | End-to-end validation |
| completion-flow.test.ts | Completion triggers |

### Performance Tests
Location: `packages/server/tests/performance/`

| Test | Target | Measure |
|------|--------|---------|
| Diagnostic latency | < 100ms | Time to publish diagnostics |
| Completion latency | < 50ms | Time to return completions |
| Memory usage | < 200MB | Memory at 100K LOC |

## Coverage Requirements

| Category | Target |
|----------|--------|
| Line Coverage | ≥ 80% |
| Branch Coverage | ≥ 75% |
| Function Coverage | ≥ 85% |

## Phase-Specific Gates

### Phase 1: Foundation
- [ ] Server lifecycle tests pass
- [ ] Document sync tests pass
- [ ] Schema validation tests pass
- [ ] Coverage ≥ 70%

### Phase 2: Intelligence
- [ ] All parser tests pass
- [ ] Completion tests pass
- [ ] Hover tests pass
- [ ] Coverage ≥ 75%

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/tests/**'],
    },
  },
})
```

## Completion Criteria

- [ ] Test plan document created
- [ ] All phases have defined gates
- [ ] Coverage targets specified
- [ ] Vitest configuration complete

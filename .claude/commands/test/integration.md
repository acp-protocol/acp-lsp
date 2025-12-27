---
name: integration
description: Generate integration tests for LSP client-server communication
version: 1.0.0
category: test
phase: all
priority: P1
pattern: generator
inputs:
  - Unit tests complete
  - LSP protocol specification
outputs:
  - packages/server/src/__integration__/*.test.ts
  - Test harness for LSP communication
handoffs:
  - target: test:performance
    context: "Integration tests pass, performance tests can verify latency"
---

# Integration Test Generation

## Purpose

Generate integration tests that verify end-to-end LSP client-server communication, document lifecycle, and cross-provider interactions.

## Prerequisites

- [ ] Unit tests passing
- [ ] Server implementation complete
- [ ] Test harness configured

## Workflow

### Phase 1: Setup Test Harness

```bash
.claude/scripts/bash/setup-integration-harness.sh
```

### Phase 2: Generate Integration Tests

```bash
.claude/scripts/bash/generate-tests.sh --integration
```

### Phase 3: Test Scenarios

- Document lifecycle (open/change/close)
- Completions end-to-end
- Navigation end-to-end
- Cross-provider interactions (diagnostics updating on cache change)

### Phase 4: Run Integration Tests

```bash
npm run test:integration
```

## Completion Criteria

- [ ] Test harness starts/stops reliably
- [ ] Document lifecycle tests pass
- [ ] Completions integration tests pass
- [ ] Navigation integration tests pass
- [ ] Cross-provider tests pass
- [ ] All integration tests in CI

---
name: unit
description: Generate unit tests for LSP providers and services
version: 1.0.0
category: test
phase: all
priority: P0
pattern: generator
inputs:
  - Test plan from test:plan
  - Implementation files
  - Coverage requirements
outputs:
  - packages/server/src/**/*.test.ts
  - Test fixtures
  - Coverage configuration
handoffs:
  - target: test:integration
    context: "Unit tests complete, integration tests can verify end-to-end"
---

# Unit Test Generation

## Purpose

Generate comprehensive unit tests for all LSP providers and services with coverage targets per the requirements specification.

## Coverage Targets

| Component | Target |
|-----------|--------|
| Annotation parser | 95% |
| Variable resolver | 95% |
| Constraint engine | 90% |
| Schema validator | 90% |
| Diagnostic provider | 90% |
| Completion provider | 85% |
| Hover provider | 85% |

## Workflow

### Phase 1: Generate Test Files

```bash
.claude/scripts/bash/generate-tests.sh <provider-or-service>
```

### Phase 2: Create Fixtures

Use templates in `.claude/templates/test/` for:
- Valid annotation samples
- Invalid annotation samples
- JSON schema test data
- Edge cases from spec

### Phase 3: Run Tests

```bash
npm run test:unit
npm run test:coverage
```

### Phase 4: Verify Coverage

```bash
.claude/scripts/bash/check-coverage.sh
```

## Completion Criteria

- [ ] Test utilities created
- [ ] Parser tests with 95% coverage
- [ ] Provider tests with 85% coverage
- [ ] Service tests with 90% coverage
- [ ] All tests passing
- [ ] Coverage thresholds met
- [ ] Fixtures for edge cases

---
name: performance
description: Optimize LSP server performance to meet latency requirements
version: 1.0.0
category: polish
phase: 5
priority: P1
pattern: analyzer
inputs:
  - Performance test results
  - Latency requirements (Section 17)
  - Resource limits
outputs:
  - Performance optimizations
  - Benchmarking suite
  - Performance documentation
handoffs:
  - target: polish:package
    context: "Performance targets met, ready for packaging"
---

# Performance Optimization

## Purpose

Analyze and optimize LSP server performance to meet the latency and resource requirements.

## Performance Targets

| Operation | Target | Maximum |
|-----------|--------|---------|
| Diagnostics (incremental) | < 50ms | 100ms |
| Completions | < 30ms | 50ms |
| Hover | < 20ms | 30ms |
| Go to definition | < 50ms | 100ms |
| Find references | < 100ms | 300ms |
| Semantic tokens | < 100ms | 200ms |

## Workflow

### Phase 1: Run Benchmarks

```bash
.claude/scripts/bash/run-benchmarks.sh
```

### Phase 2: Identify Bottlenecks

Review benchmark output and identify operations exceeding targets.

### Phase 3: Apply Optimizations

1. **Incremental parsing** - Only re-parse changed regions
2. **Lazy cache loading** - Load sections on demand
3. **Result caching** - LRU cache for completions, hover
4. **Debouncing** - 100ms debounce for validation
5. **Request cancellation** - Support cancellation tokens

### Phase 4: Verify Improvements

```bash
.claude/scripts/bash/run-benchmarks.sh --compare baseline.json
```

## Completion Criteria

- [ ] All latency targets met
- [ ] Memory usage < 200MB for 100K LOC
- [ ] Benchmark suite created
- [ ] Optimizations documented
- [ ] Performance report generated

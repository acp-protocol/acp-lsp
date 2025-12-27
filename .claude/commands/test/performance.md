---
name: performance
description: Generate performance tests and benchmarks for LSP operations
version: 1.0.0
category: test
phase: all
priority: P1
pattern: generator
inputs:
  - Performance targets from requirements
  - Integration tests complete
outputs:
  - packages/server/src/__benchmarks__/*.bench.ts
  - Benchmark configuration
  - Performance baseline
handoffs:
  - target: polish:performance
    context: "Benchmarks created, performance optimization can use them"
---

# Performance Test Generation

## Purpose

Generate performance benchmarks for all LSP operations to verify they meet latency requirements and establish baselines for optimization.

## Prerequisites

- [ ] Integration tests passing (`/test:integration`)
- [ ] Server implementation complete

## Performance Targets

From ACP LSP Requirements Section 17:

| Operation | Target | Maximum |
|-----------|--------|---------|
| Diagnostics (incremental) | < 50ms | 100ms |
| Diagnostics (full file) | < 200ms | 500ms |
| Completions | < 30ms | 50ms |
| Hover | < 20ms | 30ms |
| Go to definition | < 50ms | 100ms |
| Find references | < 100ms | 300ms |
| Semantic tokens | < 100ms | 200ms |
| Code lens | < 100ms | 200ms |

## Workflow

### Phase 1: Setup Benchmark Configuration

Create `vitest.config.bench.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__benchmarks__/**/*.bench.ts'],
    benchmark: {
      include: ['**/*.bench.ts'],
      reporters: ['default', 'json'],
      outputFile: './benchmark-results.json',
    },
  },
});
```

### Phase 2: Create Benchmark Harness

Create `packages/server/src/__benchmarks__/harness.ts`:

```typescript
import { TextDocument } from 'vscode-languageserver-textdocument';

export function createLargeDocument(lines: number): TextDocument {
  const content = Array.from({ length: lines }, (_, i) => {
    if (i % 10 === 0) {
      return `// @acp:lock normal - Line ${i} annotation`;
    }
    return `const line${i} = ${i};`;
  }).join('\n');

  return TextDocument.create('file:///large.ts', 'typescript', 1, content);
}

export function createAnnotationHeavyDocument(): TextDocument {
  const annotations = [
    '// @acp:lock frozen - Critical security code',
    '// @acp:domain auth - Authentication module',
    '// @acp:owner security-team - Security team owns this',
    '// @acp:ref https://docs.example.com/auth',
  ];

  const content = annotations.join('\n') + '\n' +
    'export function validateToken(token: string): boolean {\n' +
    '  return token.length > 0;\n' +
    '}';

  return TextDocument.create('file:///annotated.ts', 'typescript', 1, content);
}
```

### Phase 3: Create Operation Benchmarks

Create `packages/server/src/__benchmarks__/providers.bench.ts`:

```typescript
import { bench, describe } from 'vitest';
import { DiagnosticProvider } from '../providers/diagnostics';
import { CompletionProvider } from '../providers/completion';
import { HoverProvider } from '../providers/hover';
import { createLargeDocument, createAnnotationHeavyDocument } from './harness';

describe('Diagnostics', () => {
  const provider = new DiagnosticProvider(/* mocks */);
  const largeDoc = createLargeDocument(10000);
  const annotatedDoc = createAnnotationHeavyDocument();

  bench('incremental validation', async () => {
    await provider.validateDocument(annotatedDoc);
  }, { time: 1000 });

  bench('full file validation (10K lines)', async () => {
    await provider.validateDocument(largeDoc);
  }, { time: 1000 });
});

describe('Completions', () => {
  const provider = new CompletionProvider(/* mocks */);
  const doc = createAnnotationHeavyDocument();

  bench('namespace completions', async () => {
    await provider.provideCompletions(doc, {
      position: { line: 0, character: 7 },
    });
  }, { time: 1000 });
});

describe('Hover', () => {
  const provider = new HoverProvider(/* mocks */);
  const doc = createAnnotationHeavyDocument();

  bench('annotation hover', async () => {
    await provider.provideHover(doc, {
      position: { line: 0, character: 10 },
    });
  }, { time: 1000 });
});
```

### Phase 4: Run Benchmarks

```bash
npm run bench
```

### Phase 5: Generate Baseline

```bash
npm run bench -- --outputFile=baseline.json
```

## Completion Criteria

- [ ] Benchmark harness created
- [ ] All provider benchmarks created
- [ ] Benchmarks run successfully
- [ ] Baseline captured
- [ ] Results exported to JSON
- [ ] All targets verified

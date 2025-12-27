---
name: parsers
description: Implement annotation parsers for all six supported languages
version: 1.0.0
category: intelligence
phase: 2
priority: P0
pattern: generator
inputs:
  - EBNF grammar from ACP spec
  - Comment syntax per language
  - tree-sitter grammars (reference)
outputs:
  - packages/server/src/parsers/annotation.ts
  - packages/server/src/parsers/typescript.ts
  - packages/server/src/parsers/javascript.ts
  - packages/server/src/parsers/python.ts
  - packages/server/src/parsers/rust.ts
  - packages/server/src/parsers/go.ts
  - packages/server/src/parsers/java.ts
handoffs:
  - target: intelligence:completions
    context: "Parsers ready, completions can use parsed annotations for context"
---

# Annotation Parser Implementation

## Purpose

Implement annotation parsers that extract ACP annotations from comments in all six supported languages: TypeScript, JavaScript, Python, Rust, Go, and Java/C#/C++.

## Prerequisites

- [ ] Diagnostics provider ready (`/foundation:diagnostics`)
- [ ] EBNF grammar understood

## Workflow

### Phase 1: Create Base Annotation Parser

Create `packages/server/src/parsers/annotation.ts`:

```typescript
import { Range, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export interface ParsedAnnotation {
  namespace: string;
  value: string;
  directive?: string;
  range: Range;
  raw: string;
}

export interface AnnotationParseResult {
  annotations: ParsedAnnotation[];
  errors: AnnotationError[];
}

export interface AnnotationError {
  code: string;
  message: string;
  range: Range;
}

// EBNF: annotation = "@acp:" namespace ":" value [" - " directive]
const ANNOTATION_PATTERN = /@acp:(\w+)\s+(\S+)(?:\s+-\s+(.+))?/g;

export abstract class AnnotationParser {
  abstract getCommentRanges(document: TextDocument): Range[];

  parse(document: TextDocument): AnnotationParseResult {
    const annotations: ParsedAnnotation[] = [];
    const errors: AnnotationError[] = [];
    const text = document.getText();

    const commentRanges = this.getCommentRanges(document);

    for (const range of commentRanges) {
      const commentText = this.getTextInRange(document, range);
      const result = this.parseComment(commentText, range, document);
      annotations.push(...result.annotations);
      errors.push(...result.errors);
    }

    return { annotations, errors };
  }

  protected parseComment(
    text: string,
    commentRange: Range,
    document: TextDocument
  ): AnnotationParseResult {
    const annotations: ParsedAnnotation[] = [];
    const errors: AnnotationError[] = [];

    ANNOTATION_PATTERN.lastIndex = 0;
    let match;

    while ((match = ANNOTATION_PATTERN.exec(text)) !== null) {
      const [raw, namespace, value, directive] = match;
      
      if (!this.isValidNamespace(namespace)) {
        errors.push({
          code: 'E101',
          message: `Unknown namespace: ${namespace}`,
          range: this.getMatchRange(match, commentRange, document),
        });
        continue;
      }

      annotations.push({
        namespace,
        value,
        directive: directive?.trim(),
        range: this.getMatchRange(match, commentRange, document),
        raw,
      });
    }

    return { annotations, errors };
  }

  private isValidNamespace(namespace: string): boolean {
    const validNamespaces = [
      'lock', 'domain', 'layer', 'owner', 'status',
      'context', 'ref', 'related', 'depends', 'critical',
      'perf', 'security', 'style', 'todo', 'hack', 'note',
    ];
    return validNamespaces.includes(namespace);
  }

  protected getTextInRange(document: TextDocument, range: Range): string {
    return document.getText(range);
  }

  protected abstract getMatchRange(
    match: RegExpExecArray,
    commentRange: Range,
    document: TextDocument
  ): Range;
}
```

### Phase 2: Implement Language-Specific Parsers

Create parser for each language with correct comment detection:

| Language | Line Comment | Block Comment |
|----------|--------------|---------------|
| TypeScript/JS | `//` | `/* */` |
| Python | `#` | `""" """` |
| Rust | `//` | `/* */` |
| Go | `//` | `/* */` |
| Java/C#/C++ | `//` | `/* */` |

### Phase 3: Create TypeScript Parser

Create `packages/server/src/parsers/typescript.ts`:

```typescript
import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { AnnotationParser } from './annotation';

export class TypeScriptAnnotationParser extends AnnotationParser {
  getCommentRanges(document: TextDocument): Range[] {
    const ranges: Range[] = [];
    const text = document.getText();
    
    // Line comments
    const lineCommentPattern = /\/\/.*$/gm;
    let match;
    while ((match = lineCommentPattern.exec(text)) !== null) {
      ranges.push(this.indexToRange(document, match.index, match[0].length));
    }

    // Block comments
    const blockCommentPattern = /\/\*[\s\S]*?\*\//g;
    while ((match = blockCommentPattern.exec(text)) !== null) {
      ranges.push(this.indexToRange(document, match.index, match[0].length));
    }

    return ranges;
  }

  private indexToRange(doc: TextDocument, index: number, length: number): Range {
    return {
      start: doc.positionAt(index),
      end: doc.positionAt(index + length),
    };
  }

  protected getMatchRange(
    match: RegExpExecArray,
    commentRange: Range,
    document: TextDocument
  ): Range {
    const startOffset = document.offsetAt(commentRange.start) + match.index;
    return {
      start: document.positionAt(startOffset),
      end: document.positionAt(startOffset + match[0].length),
    };
  }
}
```

### Phase 4: Implement Remaining Parsers

Create parsers for Python, Rust, Go, Java using same pattern.

### Phase 5: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh parsers
```

## Completion Criteria

- [ ] TypeScript parser extracts annotations
- [ ] JavaScript parser extracts annotations
- [ ] Python parser extracts annotations
- [ ] Rust parser extracts annotations
- [ ] Go parser extracts annotations
- [ ] Java/C#/C++ parser extracts annotations
- [ ] Invalid namespaces produce errors
- [ ] Directive separator handled correctly
- [ ] Unit tests with 95% coverage

---
name: completions
description: Implement completion provider for ACP annotations, namespaces, and variables
version: 1.0.0
category: intelligence
phase: 2
priority: P0
pattern: generator
inputs:
  - Parsed annotations from parsers
  - Cache data for symbols/files/domains
  - Variable definitions
outputs:
  - packages/server/src/providers/completion.ts
  - Completion items with documentation
  - Trigger character handling
handoffs:
  - target: intelligence:hover
    context: "Completions implemented, hover can reuse annotation metadata"
---

# Completion Provider Implementation

## Purpose

Implement a completion provider that offers contextual completions for ACP annotations, including namespace suggestions, value completions, and variable references.

## Prerequisites

- [ ] Parsers implemented (`/intelligence:parsers`)
- [ ] Cache service available for symbol lookup

## Workflow

### Phase 1: Create Completion Provider

Create `packages/server/src/providers/completion.ts`:

```typescript
import {
  CompletionItem,
  CompletionItemKind,
  CompletionParams,
  InsertTextFormat,
  MarkupKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CacheService } from '../services/cache';

export class CompletionProvider {
  constructor(private cacheService: CacheService) {}

  async provideCompletions(
    document: TextDocument,
    params: CompletionParams
  ): Promise<CompletionItem[]> {
    const position = params.position;
    const line = document.getText({
      start: { line: position.line, character: 0 },
      end: position,
    });

    // Determine completion context
    if (this.isAfterAtAcp(line)) {
      return this.getNamespaceCompletions();
    }

    if (this.isAfterNamespace(line, 'lock')) {
      return this.getLockLevelCompletions();
    }

    if (this.isAfterNamespace(line, 'domain')) {
      return this.getDomainCompletions();
    }

    if (this.isVariableContext(line)) {
      return this.getVariableCompletions();
    }

    // Default: offer @acp: prefix
    if (this.isInComment(line)) {
      return this.getAnnotationPrefixCompletion();
    }

    return [];
  }

  private isAfterAtAcp(line: string): boolean {
    return /@acp:$/.test(line);
  }

  private isAfterNamespace(line: string, namespace: string): boolean {
    return new RegExp(`@acp:${namespace}\\s+$`).test(line);
  }

  private isVariableContext(line: string): boolean {
    return /\$[A-Z]*$/.test(line);
  }

  private isInComment(line: string): boolean {
    return line.includes('//') || line.includes('#') || line.includes('/*');
  }

  private getNamespaceCompletions(): CompletionItem[] {
    const namespaces = [
      { name: 'lock', desc: 'Set modification restrictions' },
      { name: 'domain', desc: 'Assign to business domain' },
      { name: 'layer', desc: 'Assign to architectural layer' },
      { name: 'owner', desc: 'Designate code owner' },
      { name: 'status', desc: 'Mark development status' },
      { name: 'context', desc: 'Provide AI context' },
      { name: 'ref', desc: 'Link to documentation' },
      { name: 'related', desc: 'Link related code' },
      { name: 'depends', desc: 'Declare dependencies' },
      { name: 'critical', desc: 'Mark critical code' },
      { name: 'perf', desc: 'Performance annotation' },
      { name: 'security', desc: 'Security annotation' },
      { name: 'style', desc: 'Style constraints' },
      { name: 'todo', desc: 'TODO with metadata' },
      { name: 'hack', desc: 'Temporary hack with expiry' },
      { name: 'note', desc: 'Developer note' },
    ];

    return namespaces.map((ns) => ({
      label: ns.name,
      kind: CompletionItemKind.Keyword,
      detail: ns.desc,
      insertText: `${ns.name} `,
      documentation: {
        kind: MarkupKind.Markdown,
        value: `**@acp:${ns.name}**\n\n${ns.desc}`,
      },
    }));
  }

  private getLockLevelCompletions(): CompletionItem[] {
    const levels = [
      { level: 'frozen', desc: 'AI MUST NOT modify' },
      { level: 'restricted', desc: 'AI MUST explain and get approval' },
      { level: 'approval-required', desc: 'AI SHOULD ask for approval' },
      { level: 'tests-required', desc: 'AI MUST include tests' },
      { level: 'docs-required', desc: 'AI MUST update docs' },
      { level: 'review-required', desc: 'Changes need review' },
      { level: 'normal', desc: 'AI may modify freely' },
      { level: 'experimental', desc: 'AI may modify aggressively' },
    ];

    return levels.map((l, index) => ({
      label: l.level,
      kind: CompletionItemKind.EnumMember,
      detail: l.desc,
      sortText: String(index).padStart(2, '0'),
      insertText: `${l.level} - `,
      documentation: {
        kind: MarkupKind.Markdown,
        value: `**${l.level}**\n\n${l.desc}`,
      },
    }));
  }

  private async getDomainCompletions(): Promise<CompletionItem[]> {
    const domains = await this.cacheService.getAllDomains();
    return domains.map((d) => ({
      label: d.name,
      kind: CompletionItemKind.Module,
      detail: d.description || `${d.files.length} files`,
      insertText: `${d.name} - `,
    }));
  }

  private async getVariableCompletions(): Promise<CompletionItem[]> {
    // TODO: Load from .acp.vars.json
    return [
      {
        label: '$SYM_',
        kind: CompletionItemKind.Variable,
        detail: 'Symbol variable',
        insertText: 'SYM_',
        insertTextFormat: InsertTextFormat.PlainText,
      },
      {
        label: '$FILE_',
        kind: CompletionItemKind.Variable,
        detail: 'File variable',
        insertText: 'FILE_',
      },
      {
        label: '$DOM_',
        kind: CompletionItemKind.Variable,
        detail: 'Domain variable',
        insertText: 'DOM_',
      },
    ];
  }

  private getAnnotationPrefixCompletion(): CompletionItem[] {
    return [{
      label: '@acp:',
      kind: CompletionItemKind.Snippet,
      detail: 'ACP annotation',
      insertText: '@acp:${1|lock,domain,context,ref|} ${2:value} - ${3:directive}',
      insertTextFormat: InsertTextFormat.Snippet,
    }];
  }
}
```

### Phase 2: Implement Resolve Provider

Add completion item resolution for lazy documentation loading.

### Phase 3: Handle Trigger Characters

Ensure trigger characters (`@`, `:`, `$`, `.`) work correctly.

### Phase 4: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh completion
```

## Completion Criteria

- [ ] @acp: triggers namespace completions
- [ ] Namespace-specific value completions work
- [ ] Lock levels complete with hierarchy
- [ ] Domains complete from cache
- [ ] Variables complete with prefixes
- [ ] Trigger characters work
- [ ] Documentation shown in completions
- [ ] Unit tests with 85% coverage

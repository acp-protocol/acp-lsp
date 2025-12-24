/**
 * ACP Language Server - Completion Provider
 * @acp:purpose Completions - Provides context-aware completions for annotations
 * @acp:module "Providers"
 */
import { CompletionItem, CompletionItemKind, CompletionParams, InsertTextFormat, MarkupKind } from 'vscode-languageserver';
import { DocumentManager } from '../documents/manager';
import { AnnotationParser } from '../parsers/annotation-parser';
import { SchemaValidator } from '../services/schema-validator';
import { Logger } from '../utils/logger';

const NAMESPACE_DOCS: Record<string, string> = {
  purpose: 'File-level purpose description',
  module: 'Module/component name',
  domain: 'Business domain',
  owner: 'Code owner or team',
  layer: 'Architecture layer (handler, service, repository, etc.)',
  stability: 'API stability (stable, experimental, deprecated)',
  ref: 'External reference URL',
  fn: 'Function documentation',
  class: 'Class documentation',
  method: 'Method documentation',
  param: 'Parameter documentation',
  returns: 'Return value documentation',
  throws: 'Exception documentation',
  example: 'Usage example',
  deprecated: 'Deprecation notice',
  lock: 'Modification constraint level',
  'lock-reason': 'Reason for lock constraint',
  style: 'Code style requirements',
  behavior: 'Behavioral constraints',
  quality: 'Quality requirements',
  test: 'Testing requirements',
  critical: 'Critical code marker',
  todo: 'TODO marker',
  fixme: 'FIXME marker',
  perf: 'Performance consideration',
  hack: 'Temporary workaround',
  debug: 'Debug marker',
};

const LOCK_LEVEL_DOCS: Record<string, string> = {
  frozen: 'MUST NOT modify under any circumstances',
  restricted: 'Modifications require explicit approval',
  'approval-required': 'Changes need review approval',
  'tests-required': 'Must have tests before changes',
  'docs-required': 'Must update docs with changes',
  'review-required': 'Changes need code review',
  normal: 'Standard modification rules apply',
  experimental: 'Code is experimental, changes welcome',
};

export class CompletionProvider {
  private logger: Logger;

  constructor(
    private documentManager: DocumentManager,
    private annotationParser: AnnotationParser,
    private schemaValidator: SchemaValidator,
    logger: Logger
  ) {
    this.logger = logger.child('CompletionProvider');
  }

  provideCompletions(params: CompletionParams): CompletionItem[] {
    const document = this.documentManager.getDocument(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    const offset = document.offsetAt(params.position);
    const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
    const lineText = text.substring(lineStart, offset);

    // Check if we're in a comment with @acp:
    if (lineText.includes('@acp:')) {
      const afterAcp = lineText.substring(lineText.lastIndexOf('@acp:') + 5);
      
      // Completing namespace
      if (!afterAcp.includes(' ')) {
        return this.getNamespaceCompletions(afterAcp);
      }

      // Completing lock level
      if (afterAcp.startsWith('lock ')) {
        return this.getLockLevelCompletions();
      }

      // Completing layer
      if (afterAcp.startsWith('layer ')) {
        return this.getLayerCompletions();
      }

      // Completing stability
      if (afterAcp.startsWith('stability ')) {
        return this.getStabilityCompletions();
      }
    }

    // Check for @acp: trigger
    if (lineText.endsWith('@acp:') || lineText.endsWith('@')) {
      return this.getNamespaceCompletions('');
    }

    return [];
  }

  resolveCompletion(item: CompletionItem): CompletionItem {
    return item;
  }

  private getNamespaceCompletions(prefix: string): CompletionItem[] {
    return this.annotationParser.getNamespaces()
      .filter(ns => ns.startsWith(prefix))
      .map((ns, i) => ({
        label: ns,
        kind: CompletionItemKind.Keyword,
        detail: `@acp:${ns}`,
        documentation: { kind: MarkupKind.Markdown, value: NAMESPACE_DOCS[ns] || '' },
        insertText: `${ns} \${1:value} - \${2:description}`,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: String(i).padStart(3, '0'),
      }));
  }

  private getLockLevelCompletions(): CompletionItem[] {
    return this.annotationParser.getLockLevels().map((level, i) => ({
      label: level,
      kind: CompletionItemKind.EnumMember,
      detail: `Lock level: ${level}`,
      documentation: { kind: MarkupKind.Markdown, value: LOCK_LEVEL_DOCS[level] || '' },
      sortText: String(i).padStart(2, '0'),
    }));
  }

  private getLayerCompletions(): CompletionItem[] {
    return this.annotationParser.getLayers().map((layer, i) => ({
      label: layer,
      kind: CompletionItemKind.EnumMember,
      detail: `Architecture layer: ${layer}`,
      sortText: String(i).padStart(2, '0'),
    }));
  }

  private getStabilityCompletions(): CompletionItem[] {
    return ['stable', 'experimental', 'deprecated'].map((s, i) => ({
      label: s,
      kind: CompletionItemKind.EnumMember,
      detail: `Stability: ${s}`,
      sortText: String(i).padStart(2, '0'),
    }));
  }
}

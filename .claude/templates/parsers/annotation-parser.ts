/**
 * ACP Language Server - Annotation Parser
 * @acp:purpose Annotation Parsing - Extracts and validates ACP annotations
 * @acp:module "Parsers"
 * @acp:lock restricted - Core parsing logic
 */
import { Range, Position, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';

export type AnnotationCategory = 'file-level' | 'symbol-level' | 'constraint' | 'inline';
export type LockLevel = 'frozen' | 'restricted' | 'approval-required' | 'tests-required' | 'docs-required' | 'review-required' | 'normal' | 'experimental';
export type ArchitectureLayer = 'handler' | 'controller' | 'service' | 'repository' | 'model' | 'utility' | 'config';

export interface VariableReference { raw: string; name: string; modifier?: 'full' | 'ref' | 'signature'; offset: number; resolved: boolean; }
export interface ParsedAnnotation { raw: string; namespace: string; category: AnnotationCategory; value?: string; description?: string; metadata: string[]; range: Range; line: number; variableRefs: VariableReference[]; diagnostics: Diagnostic[]; }
export interface ParseResult { annotations: ParsedAnnotation[]; diagnostics: Diagnostic[]; parseTimeMs: number; complete: boolean; }

const NAMESPACE_CATEGORIES: Record<string, AnnotationCategory> = {
  purpose: 'file-level', module: 'file-level', domain: 'file-level', owner: 'file-level', layer: 'file-level', stability: 'file-level', ref: 'file-level',
  fn: 'symbol-level', class: 'symbol-level', method: 'symbol-level', param: 'symbol-level', returns: 'symbol-level', throws: 'symbol-level', example: 'symbol-level', deprecated: 'symbol-level',
  lock: 'constraint', 'lock-reason': 'constraint', style: 'constraint', behavior: 'constraint', quality: 'constraint', test: 'constraint',
  critical: 'inline', todo: 'inline', fixme: 'inline', perf: 'inline', hack: 'inline', debug: 'inline',
};

const KNOWN_NAMESPACES = new Set(Object.keys(NAMESPACE_CATEGORIES));
const VALID_LOCK_LEVELS: LockLevel[] = ['frozen', 'restricted', 'approval-required', 'tests-required', 'docs-required', 'review-required', 'normal', 'experimental'];
const VALID_LAYERS: ArchitectureLayer[] = ['handler', 'controller', 'service', 'repository', 'model', 'utility', 'config'];
const VALID_STABILITY = ['stable', 'experimental', 'deprecated'];

export class AnnotationParser {
  private readonly ANNOTATION_PATTERN = /@acp:([a-zA-Z_][a-zA-Z0-9_-]*)\s*(.*?)(?=@acp:|$)/gs;
  private readonly VARIABLE_PATTERN = /\$([A-Z_][A-Z0-9_]*)(?:\.([a-z]+))?/g;
  private logger: Logger;

  constructor(logger: Logger) { this.logger = logger.child('AnnotationParser'); }

  parse(document: TextDocument): ParseResult {
    const startTime = performance.now();
    const annotations: ParsedAnnotation[] = [];
    const diagnostics: Diagnostic[] = [];
    for (const comment of this.extractComments(document)) {
      const result = this.parseComment(comment.text, comment.range, document);
      annotations.push(...result.annotations);
      diagnostics.push(...result.diagnostics);
    }
    return { annotations, diagnostics, parseTimeMs: performance.now() - startTime, complete: true };
  }

  getAnnotationAt(document: TextDocument, position: Position): ParsedAnnotation | undefined {
    const offset = document.offsetAt(position);
    return this.parse(document).annotations.find((a) => {
      const s = document.offsetAt(a.range.start), e = document.offsetAt(a.range.end);
      return offset >= s && offset <= e;
    });
  }

  getNamespaces(): string[] { return Array.from(KNOWN_NAMESPACES); }
  getLockLevels(): LockLevel[] { return [...VALID_LOCK_LEVELS]; }
  getLayers(): ArchitectureLayer[] { return [...VALID_LAYERS]; }

  private parseComment(text: string, commentRange: Range, document: TextDocument) {
    const annotations: ParsedAnnotation[] = [], diagnostics: Diagnostic[] = [];
    this.ANNOTATION_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = this.ANNOTATION_PATTERN.exec(text)) !== null) {
      const [fullMatch, namespace, rest] = match;
      const range = this.calcRange(commentRange, match.index, fullMatch.length, document);
      if (!KNOWN_NAMESPACES.has(namespace)) diagnostics.push({ severity: DiagnosticSeverity.Warning, range, message: `Unknown namespace: @acp:${namespace}`, source: 'acp', code: 'unknown-namespace' });
      const directive = this.parseDirective(rest.trim());
      const annotation: ParsedAnnotation = { raw: fullMatch.trim(), namespace, category: NAMESPACE_CATEGORIES[namespace] || 'inline', value: directive.value, description: directive.description, metadata: directive.metadata, range, line: range.start.line + 1, variableRefs: this.extractVars(fullMatch), diagnostics: [] };
      const valDiags = this.validate(annotation);
      annotation.diagnostics.push(...valDiags);
      diagnostics.push(...valDiags);
      annotations.push(annotation);
    }
    return { annotations, diagnostics };
  }

  private parseDirective(text: string): { value?: string; description?: string; metadata: string[] } {
    if (!text) return { metadata: [] };
    const parts = text.split('|').map(p => p.trim());
    const main = parts[0], metadata = parts.slice(1);
    const dash = main.indexOf(' - ');
    if (dash === -1) return { value: main || undefined, metadata };
    return { value: main.substring(0, dash).trim() || undefined, description: main.substring(dash + 3).trim() || undefined, metadata };
  }

  private extractVars(text: string): VariableReference[] {
    const refs: VariableReference[] = [];
    this.VARIABLE_PATTERN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = this.VARIABLE_PATTERN.exec(text)) !== null) refs.push({ raw: m[0], name: m[1], modifier: m[2] as any, offset: m.index, resolved: false });
    return refs;
  }

  private validate(ann: ParsedAnnotation): Diagnostic[] {
    const diags: Diagnostic[] = [];
    if (ann.namespace === 'lock' && ann.value && !VALID_LOCK_LEVELS.includes(ann.value as LockLevel)) diags.push({ severity: DiagnosticSeverity.Error, range: ann.range, message: `Invalid lock level: ${ann.value}`, source: 'acp', code: 'invalid-lock-level' });
    if (ann.namespace === 'layer' && ann.value && !VALID_LAYERS.includes(ann.value as ArchitectureLayer)) diags.push({ severity: DiagnosticSeverity.Error, range: ann.range, message: `Invalid layer: ${ann.value}`, source: 'acp', code: 'invalid-layer' });
    if (ann.namespace === 'stability' && ann.value && !VALID_STABILITY.includes(ann.value)) diags.push({ severity: DiagnosticSeverity.Error, range: ann.range, message: `Invalid stability: ${ann.value}`, source: 'acp', code: 'invalid-stability' });
    return diags;
  }

  private extractComments(document: TextDocument): Array<{ text: string; range: Range }> {
    const text = document.getText(), comments: Array<{ text: string; range: Range }> = [];
    for (const pattern of [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g, /#.*$/gm]) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        if (m[0].includes('@acp:')) comments.push({ text: m[0], range: { start: document.positionAt(m.index), end: document.positionAt(m.index + m[0].length) } });
      }
    }
    return comments;
  }

  private calcRange(commentRange: Range, offset: number, length: number, document: TextDocument): Range {
    const start = document.offsetAt(commentRange.start) + offset;
    return { start: document.positionAt(start), end: document.positionAt(start + length) };
  }
}

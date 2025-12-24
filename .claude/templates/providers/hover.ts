/**
 * ACP Language Server - Hover Provider
 * @acp:purpose Hover - Provides hover information for annotations
 * @acp:module "Providers"
 */
import { Hover, HoverParams, MarkupKind } from 'vscode-languageserver';
import { DocumentManager } from '../documents/manager';
import { AnnotationParser, ParsedAnnotation } from '../parsers/annotation-parser';
import { SchemaValidator } from '../services/schema-validator';
import { Logger } from '../utils/logger';

const NAMESPACE_DOCS: Record<string, { title: string; description: string; example: string }> = {
  purpose: { title: 'Purpose', description: 'Describes the high-level purpose of a file or module.', example: '@acp:purpose Authentication Service - Handles user login and session management' },
  module: { title: 'Module', description: 'Defines a logical module or component name.', example: '@acp:module "Auth" - Core authentication module' },
  lock: { title: 'Lock Constraint', description: 'Defines modification restrictions on code.', example: '@acp:lock frozen - Security-critical, do not modify' },
  fn: { title: 'Function', description: 'Documents a function with its purpose.', example: '@acp:fn validateUser - Validates user credentials against database' },
  param: { title: 'Parameter', description: 'Documents a function parameter.', example: '@acp:param username - The username to validate' },
  returns: { title: 'Returns', description: 'Documents the return value of a function.', example: '@acp:returns boolean - True if user is valid' },
  throws: { title: 'Throws', description: 'Documents exceptions that may be thrown.', example: '@acp:throws AuthError - When credentials are invalid' },
  layer: { title: 'Architecture Layer', description: 'Specifies the architectural layer.', example: '@acp:layer service - Business logic layer' },
  domain: { title: 'Domain', description: 'Specifies the business domain.', example: '@acp:domain Security - Security-related code' },
  stability: { title: 'Stability', description: 'Indicates API stability level.', example: '@acp:stability stable - Production-ready API' },
  deprecated: { title: 'Deprecated', description: 'Marks code as deprecated.', example: '@acp:deprecated Use validateUserV2 instead | removal: 2.0.0' },
  todo: { title: 'TODO', description: 'Marks a task to be completed.', example: '@acp:todo Add input validation' },
  fixme: { title: 'FIXME', description: 'Marks a bug or issue to fix.', example: '@acp:fixme Race condition in async handler' },
  critical: { title: 'Critical', description: 'Marks critical code sections.', example: '@acp:critical - Core security check, do not modify' },
};

const LOCK_LEVEL_DOCS: Record<string, string> = {
  frozen: '**frozen** - MUST NOT modify under any circumstances. Code is locked due to security, compliance, or stability requirements.',
  restricted: '**restricted** - Modifications require explicit approval from code owners or security team.',
  'approval-required': '**approval-required** - Changes need review approval before merging.',
  'tests-required': '**tests-required** - All changes must include or update relevant tests.',
  'docs-required': '**docs-required** - Documentation must be updated with any changes.',
  'review-required': '**review-required** - Standard code review required.',
  normal: '**normal** - Standard modification rules apply.',
  experimental: '**experimental** - Code is experimental. Changes and improvements welcome.',
};

export class HoverProvider {
  private logger: Logger;

  constructor(
    private documentManager: DocumentManager,
    private annotationParser: AnnotationParser,
    private schemaValidator: SchemaValidator,
    logger: Logger
  ) {
    this.logger = logger.child('HoverProvider');
  }

  provideHover(params: HoverParams): Hover | null {
    const document = this.documentManager.getDocument(params.textDocument.uri);
    if (!document) return null;

    const annotation = this.annotationParser.getAnnotationAt(document, params.position);
    if (!annotation) return null;

    return this.createHover(annotation);
  }

  private createHover(annotation: ParsedAnnotation): Hover {
    const ns = annotation.namespace;
    const doc = NAMESPACE_DOCS[ns];
    
    let content = `### @acp:${ns}\n\n`;
    
    if (doc) {
      content += `${doc.description}\n\n`;
    }

    if (annotation.value) {
      content += `**Value:** \`${annotation.value}\`\n\n`;
      
      // Add lock level documentation
      if (ns === 'lock' && LOCK_LEVEL_DOCS[annotation.value]) {
        content += LOCK_LEVEL_DOCS[annotation.value] + '\n\n';
      }
    }

    if (annotation.description) {
      content += `**Description:** ${annotation.description}\n\n`;
    }

    if (annotation.metadata.length > 0) {
      content += `**Metadata:**\n`;
      for (const meta of annotation.metadata) {
        content += `- ${meta}\n`;
      }
      content += '\n';
    }

    if (annotation.variableRefs.length > 0) {
      content += `**Variable References:**\n`;
      for (const ref of annotation.variableRefs) {
        content += `- \`${ref.raw}\`\n`;
      }
      content += '\n';
    }

    if (doc?.example) {
      content += `---\n**Example:**\n\`\`\`\n${doc.example}\n\`\`\``;
    }

    return {
      contents: { kind: MarkupKind.Markdown, value: content },
      range: annotation.range,
    };
  }
}

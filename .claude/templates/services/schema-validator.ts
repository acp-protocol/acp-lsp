/**
 * ACP Language Server - Schema Validator
 * @acp:purpose Schema Validation - Validates ACP JSON files against schemas
 * @acp:module "Services"
 * @acp:lock restricted - Schema validation is critical
 */
import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';

// Import schemas (bundled at build time)
import configSchema from '../../schemas/v1/config.schema.json';
import cacheSchema from '../../schemas/v1/cache.schema.json';
import varsSchema from '../../schemas/v1/vars.schema.json';
import attemptsSchema from '../../schemas/v1/attempts.schema.json';
import syncSchema from '../../schemas/v1/sync.schema.json';
import primerSchema from '../../schemas/v1/primer.schema.json';

export type SchemaType = 'config' | 'cache' | 'vars' | 'attempts' | 'sync' | 'primer';

export interface ValidationResult {
  valid: boolean;
  schemaType: SchemaType | null;
  diagnostics: Diagnostic[];
}

export class SchemaValidator {
  private ajv: Ajv;
  private validators = new Map<SchemaType, ValidateFunction>();
  private schemas: Record<SchemaType, object>;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child('SchemaValidator');
    this.ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
    addFormats(this.ajv);
    this.schemas = { config: configSchema, cache: cacheSchema, vars: varsSchema, attempts: attemptsSchema, sync: syncSchema, primer: primerSchema };
    for (const [type, schema] of Object.entries(this.schemas)) {
      try { this.validators.set(type as SchemaType, this.ajv.compile(schema)); }
      catch (e) { this.logger.error(`Failed to compile schema: ${type}`, e); }
    }
  }

  detectSchemaType(uri: string): SchemaType | null {
    const filename = uri.split('/').pop() || '';
    if (/\.?acp\.config\.json$/.test(filename)) return 'config';
    if (/\.?acp\.cache\.json$/.test(filename)) return 'cache';
    if (/\.?acp\.vars\.json$/.test(filename)) return 'vars';
    if (filename === 'acp.attempts.json') return 'attempts';
    if (filename === 'acp.sync.json') return 'sync';
    if (/\.?primer\.json$/.test(filename)) return 'primer';
    return null;
  }

  validate(document: TextDocument): ValidationResult {
    const schemaType = this.detectSchemaType(document.uri);
    if (!schemaType) return { valid: true, diagnostics: [], schemaType: null };

    const validator = this.validators.get(schemaType);
    if (!validator) return { valid: true, diagnostics: [], schemaType };

    let data: unknown;
    try { data = JSON.parse(document.getText()); }
    catch (e) { return { valid: false, schemaType, diagnostics: [this.jsonError(document, e as Error)] }; }

    const valid = validator(data);
    const diagnostics = valid ? [] : this.toDiagnostics(document, validator.errors || [], schemaType);
    return { valid, diagnostics, schemaType };
  }

  getSchema(type: SchemaType): object | undefined { return this.schemas[type]; }

  private toDiagnostics(document: TextDocument, errors: ErrorObject[], schemaType: SchemaType): Diagnostic[] {
    return errors.map((err) => ({
      severity: DiagnosticSeverity.Error,
      range: this.findRange(document, err),
      message: this.formatError(err),
      source: `acp-schema-${schemaType}`,
      code: err.keyword,
    }));
  }

  private findRange(document: TextDocument, error: ErrorObject): Range {
    const path = error.instancePath.split('/').filter(Boolean);
    if (path.length > 0) {
      const key = `"${path[path.length - 1]}"`;
      const idx = document.getText().indexOf(key);
      if (idx !== -1) return { start: document.positionAt(idx), end: document.positionAt(idx + key.length) };
    }
    return { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } };
  }

  private formatError(error: ErrorObject): string {
    const path = error.instancePath || 'root';
    switch (error.keyword) {
      case 'required': return `Missing required property: ${error.params.missingProperty}`;
      case 'type': return `${path}: Expected ${error.params.type}`;
      case 'enum': return `${path}: Must be one of: ${error.params.allowedValues.join(', ')}`;
      case 'additionalProperties': return `${path}: Unknown property: ${error.params.additionalProperty}`;
      default: return `${path}: ${error.message || 'Validation error'}`;
    }
  }

  private jsonError(document: TextDocument, error: Error): Diagnostic {
    const match = error.message.match(/position (\d+)/);
    const pos = match ? document.positionAt(parseInt(match[1], 10)) : { line: 0, character: 0 };
    return { severity: DiagnosticSeverity.Error, range: { start: pos, end: { line: pos.line, character: 100 } }, message: `Invalid JSON: ${error.message}`, source: 'acp-json' };
  }
}

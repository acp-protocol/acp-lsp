/**
 * ACP Language Server - Configuration Store
 * @acp:purpose Configuration - Manages server settings from client
 * @acp:module "Services"
 */
import { Connection } from 'vscode-languageserver';

export interface AcpConfiguration {
  enable: boolean;
  validation: { enabled: boolean; annotationSeverity: string; schemaSeverity: string };
  cache: { autoRefresh: boolean; refreshDebounceMs: number };
  completions: { enabled: boolean; maxItems: number };
  trace: { server: 'off' | 'messages' | 'verbose' };
}

const DEFAULT_CONFIG: AcpConfiguration = {
  enable: true,
  validation: { enabled: true, annotationSeverity: 'warning', schemaSeverity: 'error' },
  cache: { autoRefresh: true, refreshDebounceMs: 500 },
  completions: { enabled: true, maxItems: 100 },
  trace: { server: 'off' },
};

export class ConfigurationStore {
  private config: AcpConfiguration = { ...DEFAULT_CONFIG };
  private listeners: Array<(config: AcpConfiguration) => void> = [];

  constructor(private connection: Connection, private hasConfigurationCapability: boolean) {}

  async initialize(): Promise<void> {
    if (this.hasConfigurationCapability) {
      try {
        const settings = await this.connection.workspace.getConfiguration({ section: 'acp' });
        this.update(settings);
      } catch {}
    }
  }

  update(settings: Partial<AcpConfiguration> | undefined): void {
    if (!settings) return;
    this.config = {
      enable: settings.enable ?? this.config.enable,
      validation: { ...this.config.validation, ...settings.validation },
      cache: { ...this.config.cache, ...settings.cache },
      completions: { ...this.config.completions, ...settings.completions },
      trace: { ...this.config.trace, ...settings.trace },
    };
    this.listeners.forEach(l => l(this.config));
  }

  get(): AcpConfiguration { return this.config; }
  isEnabled(): boolean { return this.config.enable; }
  isValidationEnabled(): boolean { return this.config.enable && this.config.validation.enabled; }
  onDidChangeConfiguration(listener: (config: AcpConfiguration) => void): void { this.listeners.push(listener); }
}

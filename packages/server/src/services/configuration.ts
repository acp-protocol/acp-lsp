/**
 * @acp:category("service")
 * @acp:agent-instructions("Configuration management service that handles workspace configuration retrieval and caching")
 */

import type { Connection } from 'vscode-languageserver'

/**
 * ACP Language Server settings structure
 */
export interface ACPSettings {
  /** Whether the server is enabled */
  enabled: boolean
  /** Validation settings */
  validation: {
    enabled: boolean
    onSave: boolean
    onType: boolean
  }
  /** Completion settings */
  completion: {
    enabled: boolean
  }
  /** Diagnostics settings */
  diagnostics: {
    enabled: boolean
    severity: 'error' | 'warning' | 'information' | 'hint'
  }
  /** Tracing level for debugging */
  trace: 'off' | 'messages' | 'verbose'
}

/**
 * Default settings when no configuration is provided
 */
export const defaultSettings: ACPSettings = {
  enabled: true,
  validation: {
    enabled: true,
    onSave: true,
    onType: true,
  },
  completion: {
    enabled: true,
  },
  diagnostics: {
    enabled: true,
    severity: 'warning',
  },
  trace: 'off',
}

/**
 * Configuration store that manages workspace and document-level settings
 */
export class ConfigurationStore {
  private connection: Connection
  private hasConfigurationCapability: boolean
  private globalSettings: ACPSettings = defaultSettings
  private documentSettings: Map<string, Promise<ACPSettings>> = new Map()

  constructor(connection: Connection, hasConfigurationCapability: boolean) {
    this.connection = connection
    this.hasConfigurationCapability = hasConfigurationCapability
  }

  /**
   * Get settings for a specific document
   */
  async getDocumentSettings(uri: string): Promise<ACPSettings> {
    if (!this.hasConfigurationCapability) {
      return this.globalSettings
    }

    let result = this.documentSettings.get(uri)
    if (!result) {
      result = this.connection.workspace.getConfiguration({
        scopeUri: uri,
        section: 'acp',
      }).then((config) => {
        return this.mergeWithDefaults(config)
      })
      this.documentSettings.set(uri, result)
    }
    return result
  }

  /**
   * Get global settings (used when configuration capability is not available)
   */
  getGlobalSettings(): ACPSettings {
    return this.globalSettings
  }

  /**
   * Update global settings
   */
  updateGlobalSettings(settings: Partial<ACPSettings>): void {
    this.globalSettings = this.mergeWithDefaults(settings)
  }

  /**
   * Clear cached settings for a specific document
   */
  clearDocumentSettings(uri: string): void {
    this.documentSettings.delete(uri)
  }

  /**
   * Clear all cached document settings
   */
  clearAllDocumentSettings(): void {
    this.documentSettings.clear()
  }

  /**
   * Check if configuration capability is available
   */
  hasConfiguration(): boolean {
    return this.hasConfigurationCapability
  }

  /**
   * Merge provided settings with defaults
   */
  private mergeWithDefaults(settings: Partial<ACPSettings> | undefined | null): ACPSettings {
    if (!settings) {
      return { ...defaultSettings }
    }
    return {
      enabled: settings.enabled ?? defaultSettings.enabled,
      validation: {
        enabled: settings.validation?.enabled ?? defaultSettings.validation.enabled,
        onSave: settings.validation?.onSave ?? defaultSettings.validation.onSave,
        onType: settings.validation?.onType ?? defaultSettings.validation.onType,
      },
      completion: {
        enabled: settings.completion?.enabled ?? defaultSettings.completion.enabled,
      },
      diagnostics: {
        enabled: settings.diagnostics?.enabled ?? defaultSettings.diagnostics.enabled,
        severity: settings.diagnostics?.severity ?? defaultSettings.diagnostics.severity,
      },
      trace: settings.trace ?? defaultSettings.trace,
    }
  }
}
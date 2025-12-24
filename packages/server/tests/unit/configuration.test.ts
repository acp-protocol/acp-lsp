import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Connection } from 'vscode-languageserver'
import { ConfigurationStore, defaultSettings, type ACPSettings } from '../../src/services/configuration.js'

/**
 * Create a mock Connection for testing
 */
function createMockConnection(configResponse?: Partial<ACPSettings>): Connection {
  return {
    workspace: {
      getConfiguration: vi.fn().mockResolvedValue(configResponse),
    },
  } as unknown as Connection
}

describe('ConfigurationStore', () => {
  describe('defaultSettings', () => {
    it('should have enabled as true by default', () => {
      expect(defaultSettings.enabled).toBe(true)
    })

    it('should have validation enabled with onSave and onType', () => {
      expect(defaultSettings.validation.enabled).toBe(true)
      expect(defaultSettings.validation.onSave).toBe(true)
      expect(defaultSettings.validation.onType).toBe(true)
    })

    it('should have completion enabled', () => {
      expect(defaultSettings.completion.enabled).toBe(true)
    })

    it('should have diagnostics enabled with warning severity', () => {
      expect(defaultSettings.diagnostics.enabled).toBe(true)
      expect(defaultSettings.diagnostics.severity).toBe('warning')
    })

    it('should have trace off by default', () => {
      expect(defaultSettings.trace).toBe('off')
    })
  })

  describe('constructor', () => {
    it('should initialize with connection and capability flag', () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, true)
      expect(store.hasConfiguration()).toBe(true)
    })

    it('should initialize without configuration capability', () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, false)
      expect(store.hasConfiguration()).toBe(false)
    })
  })

  describe('getGlobalSettings', () => {
    it('should return default settings initially', () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, true)
      const settings = store.getGlobalSettings()
      expect(settings).toEqual(defaultSettings)
    })
  })

  describe('updateGlobalSettings', () => {
    it('should update global settings with partial values', () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, true)

      store.updateGlobalSettings({ enabled: false })
      const settings = store.getGlobalSettings()

      expect(settings.enabled).toBe(false)
      expect(settings.validation).toEqual(defaultSettings.validation)
    })

    it('should update nested settings', () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, true)

      store.updateGlobalSettings({
        validation: { enabled: false, onSave: true, onType: false },
      })
      const settings = store.getGlobalSettings()

      expect(settings.validation.enabled).toBe(false)
      expect(settings.validation.onSave).toBe(true)
      expect(settings.validation.onType).toBe(false)
    })

    it('should update trace level', () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, true)

      store.updateGlobalSettings({ trace: 'verbose' })
      const settings = store.getGlobalSettings()

      expect(settings.trace).toBe('verbose')
    })

    it('should merge with defaults for missing fields', () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, true)

      store.updateGlobalSettings({ diagnostics: { enabled: false, severity: 'error' } })
      const settings = store.getGlobalSettings()

      expect(settings.diagnostics.enabled).toBe(false)
      expect(settings.diagnostics.severity).toBe('error')
      expect(settings.completion.enabled).toBe(true) // Should keep default
    })
  })

  describe('getDocumentSettings', () => {
    it('should return global settings when configuration capability is not available', async () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, false)

      const settings = await store.getDocumentSettings('file:///test.ts')

      expect(connection.workspace.getConfiguration).not.toHaveBeenCalled()
      expect(settings).toEqual(defaultSettings)
    })

    it('should fetch settings from workspace when capability is available', async () => {
      const customConfig = { enabled: false }
      const connection = createMockConnection(customConfig)
      const store = new ConfigurationStore(connection, true)

      const settings = await store.getDocumentSettings('file:///test.ts')

      expect(connection.workspace.getConfiguration).toHaveBeenCalledWith({
        scopeUri: 'file:///test.ts',
        section: 'acp',
      })
      expect(settings.enabled).toBe(false)
    })

    it('should cache document settings', async () => {
      const connection = createMockConnection({ enabled: true })
      const store = new ConfigurationStore(connection, true)

      await store.getDocumentSettings('file:///test.ts')
      await store.getDocumentSettings('file:///test.ts')

      expect(connection.workspace.getConfiguration).toHaveBeenCalledTimes(1)
    })

    it('should cache settings per document', async () => {
      const connection = createMockConnection({ enabled: true })
      const store = new ConfigurationStore(connection, true)

      await store.getDocumentSettings('file:///test1.ts')
      await store.getDocumentSettings('file:///test2.ts')

      expect(connection.workspace.getConfiguration).toHaveBeenCalledTimes(2)
    })

    it('should merge fetched settings with defaults', async () => {
      const partialConfig = { validation: { enabled: false } }
      const connection = createMockConnection(partialConfig)
      const store = new ConfigurationStore(connection, true)

      const settings = await store.getDocumentSettings('file:///test.ts')

      expect(settings.validation.enabled).toBe(false)
      expect(settings.validation.onSave).toBe(true) // From defaults
      expect(settings.validation.onType).toBe(true) // From defaults
    })

    it('should handle null config response', async () => {
      const connection = createMockConnection(undefined)
      const store = new ConfigurationStore(connection, true)

      const settings = await store.getDocumentSettings('file:///test.ts')

      expect(settings).toEqual(defaultSettings)
    })
  })

  describe('clearDocumentSettings', () => {
    it('should clear cached settings for a specific document', async () => {
      const connection = createMockConnection({ enabled: true })
      const store = new ConfigurationStore(connection, true)

      await store.getDocumentSettings('file:///test.ts')
      store.clearDocumentSettings('file:///test.ts')
      await store.getDocumentSettings('file:///test.ts')

      expect(connection.workspace.getConfiguration).toHaveBeenCalledTimes(2)
    })

    it('should not affect other document settings', async () => {
      const connection = createMockConnection({ enabled: true })
      const store = new ConfigurationStore(connection, true)

      await store.getDocumentSettings('file:///test1.ts')
      await store.getDocumentSettings('file:///test2.ts')
      store.clearDocumentSettings('file:///test1.ts')
      await store.getDocumentSettings('file:///test2.ts')

      expect(connection.workspace.getConfiguration).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearAllDocumentSettings', () => {
    it('should clear all cached document settings', async () => {
      const connection = createMockConnection({ enabled: true })
      const store = new ConfigurationStore(connection, true)

      await store.getDocumentSettings('file:///test1.ts')
      await store.getDocumentSettings('file:///test2.ts')
      store.clearAllDocumentSettings()
      await store.getDocumentSettings('file:///test1.ts')
      await store.getDocumentSettings('file:///test2.ts')

      expect(connection.workspace.getConfiguration).toHaveBeenCalledTimes(4)
    })
  })

  describe('hasConfiguration', () => {
    it('should return true when capability is available', () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, true)
      expect(store.hasConfiguration()).toBe(true)
    })

    it('should return false when capability is not available', () => {
      const connection = createMockConnection()
      const store = new ConfigurationStore(connection, false)
      expect(store.hasConfiguration()).toBe(false)
    })
  })

  describe('mergeWithDefaults edge cases', () => {
    it('should handle partially nested validation settings', async () => {
      const partialConfig = { validation: { onSave: false } }
      const connection = createMockConnection(partialConfig)
      const store = new ConfigurationStore(connection, true)

      const settings = await store.getDocumentSettings('file:///test.ts')

      expect(settings.validation.enabled).toBe(true) // From defaults
      expect(settings.validation.onSave).toBe(false) // From config
      expect(settings.validation.onType).toBe(true) // From defaults
    })

    it('should handle partially nested diagnostics settings', async () => {
      const partialConfig = { diagnostics: { severity: 'error' as const } }
      const connection = createMockConnection(partialConfig)
      const store = new ConfigurationStore(connection, true)

      const settings = await store.getDocumentSettings('file:///test.ts')

      expect(settings.diagnostics.enabled).toBe(true) // From defaults
      expect(settings.diagnostics.severity).toBe('error') // From config
    })

    it('should handle empty object config', async () => {
      const connection = createMockConnection({})
      const store = new ConfigurationStore(connection, true)

      const settings = await store.getDocumentSettings('file:///test.ts')

      expect(settings).toEqual(defaultSettings)
    })
  })
})

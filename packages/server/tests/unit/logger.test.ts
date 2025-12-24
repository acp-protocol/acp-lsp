import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { RemoteConsole } from 'vscode-languageserver'
import { Logger, LogLevel } from '../../src/utils/logger.js'

/**
 * Create a mock RemoteConsole for testing
 */
function createMockConsole(): RemoteConsole {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    connection: {} as never,
  } as unknown as RemoteConsole
}

describe('Logger', () => {
  let mockConsole: RemoteConsole
  let logger: Logger

  beforeEach(() => {
    mockConsole = createMockConsole()
    logger = new Logger(mockConsole)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-24T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('LogLevel enum', () => {
    it('should have correct ordering', () => {
      expect(LogLevel.Error).toBe(0)
      expect(LogLevel.Warn).toBe(1)
      expect(LogLevel.Info).toBe(2)
      expect(LogLevel.Debug).toBe(3)
    })

    it('should allow level comparisons', () => {
      expect(LogLevel.Debug > LogLevel.Info).toBe(true)
      expect(LogLevel.Error < LogLevel.Warn).toBe(true)
    })
  })

  describe('constructor', () => {
    it('should use default log level Info', () => {
      const newLogger = new Logger(mockConsole)
      expect(newLogger.getLevel()).toBe(LogLevel.Info)
    })

    it('should accept custom log level', () => {
      const debugLogger = new Logger(mockConsole, LogLevel.Debug)
      expect(debugLogger.getLevel()).toBe(LogLevel.Debug)
    })

    it('should accept custom prefix', () => {
      const customLogger = new Logger(mockConsole, LogLevel.Info, '[Custom]')
      customLogger.log('test')
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('[Custom]'))
    })

    it('should use default prefix [ACP-LSP]', () => {
      logger.log('test')
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('[ACP-LSP]'))
    })
  })

  describe('setLevel / getLevel', () => {
    it('should get the current level', () => {
      expect(logger.getLevel()).toBe(LogLevel.Info)
    })

    it('should set a new level', () => {
      logger.setLevel(LogLevel.Debug)
      expect(logger.getLevel()).toBe(LogLevel.Debug)
    })

    it('should affect logging behavior after change', () => {
      logger.setLevel(LogLevel.Error)
      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      expect(mockConsole.log).not.toHaveBeenCalled()
      expect(mockConsole.info).not.toHaveBeenCalled()
      expect(mockConsole.warn).not.toHaveBeenCalled()
    })
  })

  describe('error', () => {
    it('should log at all levels', () => {
      const levels = [LogLevel.Error, LogLevel.Warn, LogLevel.Info, LogLevel.Debug]
      for (const level of levels) {
        vi.clearAllMocks()
        logger.setLevel(level)
        logger.error('test error')
        expect(mockConsole.error).toHaveBeenCalledTimes(1)
      }
    })

    it('should format message with ERROR level', () => {
      logger.error('test message')
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('ERROR:'))
    })

    it('should include timestamp', () => {
      logger.error('test')
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('2024-12-24T12:00:00.000Z'))
    })
  })

  describe('warn', () => {
    it('should log at Warn level and above', () => {
      logger.setLevel(LogLevel.Warn)
      logger.warn('test warning')
      expect(mockConsole.warn).toHaveBeenCalledTimes(1)
    })

    it('should not log when level is Error', () => {
      logger.setLevel(LogLevel.Error)
      logger.warn('test warning')
      expect(mockConsole.warn).not.toHaveBeenCalled()
    })

    it('should format message with WARN level', () => {
      logger.warn('test message')
      expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('WARN:'))
    })
  })

  describe('info', () => {
    it('should log at Info level (default)', () => {
      logger.info('test info')
      expect(mockConsole.info).toHaveBeenCalledTimes(1)
    })

    it('should not log when level is Warn or lower', () => {
      logger.setLevel(LogLevel.Warn)
      logger.info('test info')
      expect(mockConsole.info).not.toHaveBeenCalled()
    })

    it('should format message with INFO level', () => {
      logger.info('test message')
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('INFO:'))
    })
  })

  describe('debug', () => {
    it('should log only at Debug level', () => {
      logger.setLevel(LogLevel.Debug)
      logger.debug('test debug')
      expect(mockConsole.log).toHaveBeenCalledTimes(1)
    })

    it('should not log at Info level (default)', () => {
      logger.debug('test debug')
      expect(mockConsole.log).not.toHaveBeenCalled()
    })

    it('should format message with DEBUG level', () => {
      logger.setLevel(LogLevel.Debug)
      logger.debug('test message')
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('DEBUG:'))
    })
  })

  describe('log', () => {
    it('should always log regardless of level', () => {
      logger.setLevel(LogLevel.Error)
      logger.log('test log')
      expect(mockConsole.log).toHaveBeenCalledTimes(1)
    })

    it('should format message with LOG level', () => {
      logger.log('test message')
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('LOG:'))
    })
  })

  describe('message formatting', () => {
    it('should format message with prefix, timestamp, and level', () => {
      logger.info('test message')
      expect(mockConsole.info).toHaveBeenCalledWith(
        '[ACP-LSP] 2024-12-24T12:00:00.000Z INFO: test message'
      )
    })

    it('should append additional string arguments', () => {
      logger.info('message', 'arg1', 'arg2')
      expect(mockConsole.info).toHaveBeenCalledWith(
        '[ACP-LSP] 2024-12-24T12:00:00.000Z INFO: message arg1 arg2'
      )
    })

    it('should stringify null', () => {
      logger.info('value:', null)
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('null'))
    })

    it('should stringify undefined', () => {
      logger.info('value:', undefined)
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('undefined'))
    })

    it('should stringify numbers', () => {
      logger.info('count:', 42)
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('42'))
    })

    it('should stringify booleans', () => {
      logger.info('flag:', true)
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('true'))
    })

    it('should stringify objects as JSON', () => {
      logger.info('obj:', { key: 'value' })
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('"key": "value"'))
    })

    it('should format Error objects with name and message', () => {
      const error = new Error('test error')
      logger.error('caught:', error)
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Error: test error'))
    })

    it('should include stack trace for errors', () => {
      const error = new Error('test error')
      error.stack = 'Error: test error\n    at test.ts:1:1'
      logger.error('caught:', error)
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('at test.ts:1:1'))
    })

    it('should handle circular references gracefully', () => {
      const circular: Record<string, unknown> = { name: 'test' }
      circular.self = circular
      // Should not throw, should fall back to String()
      expect(() => logger.info('circular:', circular)).not.toThrow()
    })

    it('should handle objects without stack gracefully', () => {
      const errorLike = new Error('no stack')
      delete errorLike.stack
      logger.error('error:', errorLike)
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Error: no stack'))
    })
  })

  describe('integration scenarios', () => {
    it('should handle rapid successive calls', () => {
      for (let i = 0; i < 100; i++) {
        logger.info(`message ${i}`)
      }
      expect(mockConsole.info).toHaveBeenCalledTimes(100)
    })

    it('should handle empty messages', () => {
      logger.info('')
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('INFO: '))
    })

    it('should handle special characters in messages', () => {
      logger.info('special: \n\t\r\\')
      expect(mockConsole.info).toHaveBeenCalled()
    })
  })
})

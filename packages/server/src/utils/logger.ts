/**
 * @acp:category("utility")
 * @acp:agent-instructions("Logger wrapper for LSP connection console with log levels and formatting")
 */

import type { RemoteConsole } from 'vscode-languageserver'

/**
 * Log level enumeration
 */
export enum LogLevel {
  Error = 0,
  Warn = 1,
  Info = 2,
  Debug = 3,
}

/**
 * Logger class that wraps the LSP connection console
 * Provides structured logging with configurable log levels
 */
export class Logger {
  private console: RemoteConsole
  private level: LogLevel
  private prefix: string

  constructor(console: RemoteConsole, level: LogLevel = LogLevel.Info, prefix: string = '[ACP-LSP]') {
    this.console = console
    this.level = level
    this.prefix = prefix
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.Error) {
      this.console.error(this.format('ERROR', message, args))
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.Warn) {
      this.console.warn(this.format('WARN', message, args))
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.Info) {
      this.console.info(this.format('INFO', message, args))
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.Debug) {
      this.console.log(this.format('DEBUG', message, args))
    }
  }

  /**
   * Log a plain message (always logged regardless of level)
   */
  log(message: string, ...args: unknown[]): void {
    this.console.log(this.format('LOG', message, args))
  }

  /**
   * Format a log message with prefix, level, and arguments
   */
  private format(level: string, message: string, args: unknown[]): string {
    const timestamp = new Date().toISOString()
    const formattedArgs = args.length > 0 ? ' ' + args.map((a) => this.stringify(a)).join(' ') : ''
    return `${this.prefix} ${timestamp} ${level}: ${message}${formattedArgs}`
  }

  /**
   * Stringify an argument for logging
   */
  private stringify(arg: unknown): string {
    if (arg === null) return 'null'
    if (arg === undefined) return 'undefined'
    if (typeof arg === 'string') return arg
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg)
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`
    }
    try {
      return JSON.stringify(arg, null, 2)
    } catch {
      return String(arg)
    }
  }
}
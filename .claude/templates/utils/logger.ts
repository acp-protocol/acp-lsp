/**
 * ACP Language Server - Logger
 * @acp:purpose Logging - Structured logging for server diagnostics
 * @acp:module "Utils"
 */
import { RemoteConsole } from 'vscode-languageserver';

export enum LogLevel { Error = 0, Warn = 1, Info = 2, Debug = 3 }

export class Logger {
  private level: LogLevel = LogLevel.Info;
  private prefix = '[ACP]';

  constructor(private console: RemoteConsole) {}

  setLevel(level: LogLevel): void { this.level = level; }
  getLevel(): LogLevel { return this.level; }

  error(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.Error) this.console.error(this.format('ERROR', message, args));
  }
  warn(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.Warn) this.console.warn(this.format('WARN', message, args));
  }
  info(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.Info) this.console.info(this.format('INFO', message, args));
  }
  debug(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.Debug) this.console.log(this.format('DEBUG', message, args));
  }

  child(component: string): Logger {
    const child = new Logger(this.console);
    child.level = this.level;
    child.prefix = `${this.prefix}[${component}]`;
    return child;
  }

  private format(level: string, message: string, args: unknown[]): string {
    let formatted = `${new Date().toISOString()} ${this.prefix}[${level}] ${message}`;
    if (args.length > 0) {
      try { formatted += ` ${JSON.stringify(args.length === 1 ? args[0] : args)}`; }
      catch { formatted += ` [Unstringifiable]`; }
    }
    return formatted;
  }
}

export function parseLogLevel(value: string): LogLevel {
  switch (value.toLowerCase()) {
    case 'error': return LogLevel.Error;
    case 'warn': case 'warning': return LogLevel.Warn;
    case 'debug': case 'verbose': return LogLevel.Debug;
    default: return LogLevel.Info;
  }
}

/**
 * Logger module for server-side logging
 * All logs are automatically captured by Sentry and sent to Vercel
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${timestamp} ${this.prefix}${level.toUpperCase()}: ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('info', message, context);
    console.log(formatted);
  }

  warn(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    const formatted = this.formatMessage('error', message, errorContext);
    console.error(formatted);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message, context);
      console.log(formatted);
    }
  }

  time(label: string): void {
    console.time(`${this.prefix}${label}`);
  }

  timeEnd(label: string): void {
    console.timeEnd(`${this.prefix}${label}`);
  }
}

// Create logger instances for different modules
export const cacheLogger = new Logger('Cache');
export const apiLogger = new Logger('API');
export const dbLogger = new Logger('DB');
export const authLogger = new Logger('Auth');
export const securityLogger = new Logger('Security'); // SECURITY: Specific logger for security events
export const appLogger = new Logger('App');

export default Logger;

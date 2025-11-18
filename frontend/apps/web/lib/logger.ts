/**
 * Production-grade logging system
 * Centralizes all application logging with proper levels, formatting, and monitoring integration
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private minLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  constructor() {
    this.minLevel =
      process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get recent logs (for debugging)
   */
  getRecentLogs(count = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear log history
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log at INFO level
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log at WARN level
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log at ERROR level
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log at FATAL level (critical errors)
   */
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    // Check if we should log at this level
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output (with colors in development)
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry);
    }

    // Send to external service in production for errors
    if (process.env.NODE_ENV === 'production' && level >= LogLevel.ERROR) {
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Output to browser console
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context, error } = entry;

    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.FATAL]: 'FATAL',
    };

    const levelColors = {
      [LogLevel.DEBUG]: 'color: gray',
      [LogLevel.INFO]: 'color: blue',
      [LogLevel.WARN]: 'color: orange',
      [LogLevel.ERROR]: 'color: red',
      [LogLevel.FATAL]: 'color: red; font-weight: bold',
    };

    const timeStr = timestamp.toISOString();
    const levelStr = levelNames[level];

    console.log(
      `%c[${timeStr}] [${levelStr}]%c ${message}`,
      levelColors[level],
      'color: inherit'
    );

    if (context) {
      console.log('Context:', context);
    }

    if (error) {
      console.error('Error:', error);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
  }

  /**
   * Send logs to monitoring service
   * Integrates with Sentry, DataDog, LogRocket, or custom endpoints
   */
  private sendToMonitoring(entry: LogEntry): void {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Example: Send to custom API endpoint for centralized logging
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: LogLevel[entry.level],
          message: entry.message,
          timestamp: entry.timestamp.toISOString(),
          context: entry.context,
          error: entry.error
            ? {
                message: entry.error.message,
                stack: entry.error.stack,
                name: entry.error.name,
              }
            : undefined,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch((err) => {
        // Silently fail - don't break the app because of logging
        console.error('Failed to send log to monitoring:', err);
      });
    } catch (err) {
      // Silently fail
      console.error('Failed to send log:', err);
    }
  }

  /**
   * Log performance metrics
   */
  performance(name: string, duration: number, context?: Record<string, unknown>): void {
    this.info(`Performance: ${name}`, {
      ...context,
      duration_ms: duration,
      metric_type: 'performance',
    });
  }

  /**
   * Log user actions for analytics
   */
  userAction(action: string, context?: Record<string, unknown>): void {
    this.info(`User Action: ${action}`, {
      ...context,
      event_type: 'user_action',
    });
  }

  /**
   * Log ICP canister calls
   */
  canisterCall(
    canister: string,
    method: string,
    success: boolean,
    duration?: number,
    error?: Error
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, `Canister Call: ${canister}.${method}`, {
      canister,
      method,
      success,
      duration_ms: duration,
    }, error);
  }

  /**
   * Log transaction events
   */
  transaction(
    txId: string,
    status: 'initiated' | 'signed' | 'broadcast' | 'confirmed' | 'failed',
    context?: Record<string, unknown>
  ): void {
    const level = status === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `Transaction ${status}: ${txId}`, {
      ...context,
      tx_id: txId,
      tx_status: status,
      event_type: 'transaction',
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types
export type { LogEntry };

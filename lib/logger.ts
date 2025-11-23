/**
 * Centralized logging utility
 * Provides structured logging with different levels and environment-aware output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  includeTimestamp: boolean;
}

const config: LoggerConfig = {
  enabled: process.env.NODE_ENV !== 'production',
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  includeTimestamp: true,
};

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const levelEmoji: Record<LogLevel, string> = {
  debug: '🔍',
  info: '✅',
  warn: '⚠️',
  error: '❌',
};

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return level === 'error';
  return levelPriority[level] >= levelPriority[config.level];
}

function formatMessage(level: LogLevel, context: string, message: string, data?: any): string {
  const timestamp = config.includeTimestamp ? new Date().toISOString() : '';
  const emoji = levelEmoji[level];
  const parts = [
    timestamp && `[${timestamp}]`,
    emoji,
    `[${level.toUpperCase()}]`,
    context && `[${context}]`,
    message,
  ].filter(Boolean);
  
  return parts.join(' ');
}

function logWithLevel(level: LogLevel, context: string, message: string, data?: any) {
  if (!shouldLog(level)) return;

  const formattedMessage = formatMessage(level, context, message, data);
  
  switch (level) {
    case 'debug':
    case 'info':
      console.log(formattedMessage, data !== undefined ? data : '');
      break;
    case 'warn':
      console.warn(formattedMessage, data !== undefined ? data : '');
      break;
    case 'error':
      console.error(formattedMessage, data !== undefined ? data : '');
      break;
  }
}

export const logger = {
  /**
   * Debug level logging - detailed information for debugging
   */
  debug: (context: string, message: string, data?: any) => {
    logWithLevel('debug', context, message, data);
  },

  /**
   * Info level logging - general informational messages
   */
  info: (context: string, message: string, data?: any) => {
    logWithLevel('info', context, message, data);
  },

  /**
   * Warning level logging - warning messages
   */
  warn: (context: string, message: string, data?: any) => {
    logWithLevel('warn', context, message, data);
  },

  /**
   * Error level logging - error messages (always logged)
   */
  error: (context: string, message: string, error?: any) => {
    logWithLevel('error', context, message, error);
  },

  /**
   * Create a logger instance with a fixed context
   */
  withContext: (context: string) => ({
    debug: (message: string, data?: any) => logger.debug(context, message, data),
    info: (message: string, data?: any) => logger.info(context, message, data),
    warn: (message: string, data?: any) => logger.warn(context, message, data),
    error: (message: string, error?: any) => logger.error(context, message, error),
  }),
};

// Export default for convenience
export default logger;

/**
 * Centralized logging infrastructure using Winston
 * 
 * Provides structured logging with different log levels and transports.
 * In production, logs to files. In development, logs to console as well.
 */

import winston from 'winston';

// Determine log level from environment or default
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Custom format for console output (development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Custom format for file output (JSON for structured logging)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
export const logger = winston.createLogger({
  level: logLevel,
  format: fileFormat,
  defaultMeta: { 
    service: 'checkers-server',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    // Error logs to separate file
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // All logs to combined file
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Add console transport in development or if explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONSOLE_LOGGING === 'true') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Note: Winston will automatically create the logs directory when writing the first log file
// No manual directory creation needed

/**
 * Helper functions for common logging scenarios
 */

// Log game events with context
export function logGameEvent(event: string, matchId: string, metadata?: Record<string, any>) {
  logger.info(`[GAME] ${event}`, { matchId, ...metadata });
}

// Log socket events with context
export function logSocketEvent(event: string, socketId: string, metadata?: Record<string, any>) {
  logger.debug(`[SOCKET] ${event}`, { socketId, ...metadata });
}

// Log database operations
export function logDatabaseOperation(operation: string, metadata?: Record<string, any>) {
  logger.debug(`[DB] ${operation}`, metadata);
}

// Log security events (rate limiting, invalid inputs, etc.)
export function logSecurityEvent(event: string, ip: string, metadata?: Record<string, any>) {
  logger.warn(`[SECURITY] ${event}`, { ip, ...metadata });
}

// Log performance metrics
export function logPerformance(metric: string, duration: number, metadata?: Record<string, any>) {
  logger.info(`[PERF] ${metric}`, { duration: `${duration}ms`, ...metadata });
}

export default logger;


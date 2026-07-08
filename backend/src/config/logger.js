/**
 * Winston Logger Configuration
 * Provides structured logging. 
 * Local file logging has been completely removed for production (Render) readiness.
 * Logs are securely pushed into memory (Mock DB) and accessible via SuperAdmin UI.
 */

const winston = require("winston");
const Transport = require("winston-transport");

// Custom Transport to push logs to our Database
class DatabaseTransport extends Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      // Lazy load to avoid circular dependencies
      const { mockData } = require('./firebase');
      if (mockData && mockData.systemLogs) {
        // Keep only the last 1000 logs to prevent memory leaks in production
        if (mockData.systemLogs.length >= 1000) {
          mockData.systemLogs.shift();
        }
        
        mockData.systemLogs.push({
          id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          timestamp: info.timestamp || new Date().toISOString(),
          level: info.level,
          message: info.message,
          stack: info.stack || null,
          meta: Object.keys(info).length > 3 ? info : null // Anything extra
        });
      }
    } catch (err) {
      console.error("Error writing to DB log:", err);
    }

    callback();
  }
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}${metaStr}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  }),
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL === "dev" ? "debug" : process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports: [
    // Console transport (Always good to have console output)
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
    // Custom Database Transport instead of ephemeral File logging
    new DatabaseTransport()
  ],
});

/**
 * Stream for Morgan HTTP request logging
 */
const morganStream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = { logger, morganStream };

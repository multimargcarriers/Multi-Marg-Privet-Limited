/**
 * Global Error Handling Middleware
 */

const { logger } = require("../config/logger");

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * 404 Not Found handler
 */
function notFound(req, res, next) {
  const error = new ApiError(
    404,
    `Route not found: ${req.method} ${req.originalUrl}`,
  );
  next(error);
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, _next) {
  // Log the error
  logger.error(`${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
    statusCode: err.statusCode || 500,
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Build response
  const response = {
    success: false,
    message: err.isOperational ? err.message : "Internal server error",
  };

  // Add details if available
  if (err.details) {
    response.details = err.details;
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === "development" && !err.isOperational) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Create a 400 Bad Request error
 */
function badRequest(message, details = null) {
  return new ApiError(400, message, details);
}

/**
 * Create a 401 Unauthorized error
 */
function unauthorized(message = "Unauthorized") {
  return new ApiError(401, message);
}

/**
 * Create a 403 Forbidden error
 */
function forbidden(message = "Forbidden") {
  return new ApiError(403, message);
}

/**
 * Create a 404 Not Found error
 */
function notFoundError(message = "Resource not found") {
  return new ApiError(404, message);
}

/**
 * Create a 409 Conflict error
 */
function conflict(message = "Resource already exists") {
  return new ApiError(409, message);
}

/**
 * Wrap async route handlers to catch errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  ApiError,
  errorHandler,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  notFoundError,
  conflict,
  asyncHandler,
};

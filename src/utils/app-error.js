
'use strict';

/**
 * MedOrbits -- Application Error
 *
 * File: src/utils/app-error.js
 *
 * Purpose:
 * - Represent expected application errors consistently.
 * - Provide standard HTTP status codes and machine-readable error codes.
 * - Support safe, optional error details.
 * - Integrate with centralized Express error middleware.
 *
 * Security:
 * - Do not put passwords, tokens, database errors, or secrets in details.
 * - The centralized error handler must decide which details are safe
 *   to expose to clients.
 */

const DEFAULT_ERROR_CODE = 'INTERNAL_SERVER_ERROR';

class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    const safeMessage =
      typeof message === 'string' && message.trim()
        ? message.trim()
        : 'An unexpected error occurred.';

    super(safeMessage);

    this.name = 'AppError';

    this.statusCode = Number.isInteger(statusCode)
      ? statusCode
      : 500;

    this.code =
      typeof options.code === 'string' && options.code.trim()
        ? options.code.trim()
        : DEFAULT_ERROR_CODE;

    this.isOperational = options.isOperational ?? true;

    if (options.details !== undefined) {
      this.details = options.details;
    }

    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(
    message = 'Bad request.',
    options = {}
  ) {
    return new AppError(message, 400, {
      ...options,
      code: options.code || 'BAD_REQUEST',
    });
  }

  static unauthorized(
    message = 'Authentication required.',
    options = {}
  ) {
    return new AppError(message, 401, {
      ...options,
      code: options.code || 'UNAUTHORIZED',
    });
  }

  static forbidden(
    message = 'Access denied.',
    options = {}
  ) {
    return new AppError(message, 403, {
      ...options,
      code: options.code || 'FORBIDDEN',
    });
  }

  static notFound(
    message = 'Resource not found.',
    options = {}
  ) {
    return new AppError(message, 404, {
      ...options,
      code: options.code || 'NOT_FOUND',
    });
  }

  static conflict(
    message = 'Resource conflict.',
    options = {}
  ) {
    return new AppError(message, 409, {
      ...options,
      code: options.code || 'CONFLICT',
    });
  }

  static validation(
    message = 'Validation failed.',
    options = {}
  ) {
    return new AppError(message, 422, {
      ...options,
      code: options.code || 'VALIDATION_ERROR',
    });
  }

  static tooManyRequests(
    message = 'Too many requests.',
    options = {}
  ) {
    return new AppError(message, 429, {
      ...options,
      code: options.code || 'RATE_LIMIT_EXCEEDED',
    });
  }

  static notImplemented(
    message = 'This operation is not implemented.',
    options = {}
  ) {
    return new AppError(message, 501, {
      ...options,
      code: options.code || 'NOT_IMPLEMENTED',
    });
  }

  static serviceUnavailable(
    message = 'Service temporarily unavailable.',
    options = {}
  ) {
    return new AppError(message, 503, {
      ...options,
      code: options.code || 'SERVICE_UNAVAILABLE',
    });
  }

  static internal(
    message = 'An unexpected error occurred.',
    options = {}
  ) {
    return new AppError(message, 500, {
      ...options,
      code: options.code || DEFAULT_ERROR_CODE,
      isOperational: options.isOperational ?? false,
    });
  }
}

module.exports = AppError;

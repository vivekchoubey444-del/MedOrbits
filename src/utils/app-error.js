'use strict';

class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    options = {}
  ) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options.code || 'INTERNAL_SERVER_ERROR';
    this.isOperational = options.isOperational ?? true;

    if (options.details !== undefined) {
      this.details = options.details;
    }

    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Bad request.', options = {}) {
    return new AppError(message, 400, {
      code: 'BAD_REQUEST',
      ...options,
    });
  }

  static unauthorized(message = 'Authentication required.', options = {}) {
    return new AppError(message, 401, {
      code: 'UNAUTHORIZED',
      ...options,
    });
  }

  static forbidden(message = 'Access denied.', options = {}) {
    return new AppError(message, 403, {
      code: 'FORBIDDEN',
      ...options,
    });
  }

  static notFound(message = 'Resource not found.', options = {}) {
    return new AppError(message, 404, {
      code: 'NOT_FOUND',
      ...options,
    });
  }

  static conflict(message = 'Resource conflict.', options = {}) {
    return new AppError(message, 409, {
      code: 'CONFLICT',
      ...options,
    });
  }

  static validation(message = 'Validation failed.', options = {}) {
    return new AppError(message, 422, {
      code: 'VALIDATION_ERROR',
      ...options,
    });
  }

  static tooManyRequests(
    message = 'Too many requests.',
    options = {}
  ) {
    return new AppError(message, 429, {
      code: 'RATE_LIMIT_EXCEEDED',
      ...options,
    });
  }

  static serviceUnavailable(
    message = 'Service temporarily unavailable.',
    options = {}
  ) {
    return new AppError(message, 503, {
      code: 'SERVICE_UNAVAILABLE',
      ...options,
    });
  }
}

module.exports = AppError;
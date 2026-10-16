
'use strict';

/**
 * MedOrbits -- HTTP Utilities
 *
 * File: src/utils/http.js
 *
 * Provides:
 * - Async Express handler wrapping.
 * - Standard success responses.
 * - Consistent application HTTP errors.
 * - Safe pagination parsing.
 */

const asyncHandler = require('./async-handler');
const AppError = require('./app-error');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_PAGE = 1000000;
const MAX_LIMIT = 100;

/**
 * Wrap an Express handler and forward rejected promises and synchronous
 * exceptions to centralized error middleware.
 */
function wrapAsyncHandler(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('asyncHandler requires a function.');
  }

  return asyncHandler(fn);
}

/**
 * Send a consistent successful JSON response.
 */
function sendSuccess(res, data, status = 200, extra = {}) {
  if (!Number.isInteger(status) || status < 200 || status >= 300) {
    throw new TypeError('Success status must be a valid 2xx HTTP status.');
  }

  if (
    extra === null ||
    typeof extra !== 'object' ||
    Array.isArray(extra)
  ) {
    throw new TypeError('Response extra must be an object.');
  }

  return res.status(status).json({
    success: true,
    data,
    ...extra,
  });
}

/**
 * Create an application error compatible with AppError.
 *
 * Preserves the legacy httpError(status, code, message) signature.
 */
function httpError(
  status,
  code,
  message
) {
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    throw new TypeError('HTTP error status must be between 400 and 599.');
  }

  if (typeof code !== 'string' || !code.trim()) {
    throw new TypeError('HTTP error code must be a non-empty string.');
  }

  if (typeof message !== 'string' || !message.trim()) {
    throw new TypeError('HTTP error message must be a non-empty string.');
  }

  return new AppError(message, status, {
    code: code.trim(),
    isOperational: true,
  });
}

/**
 * Parse a positive integer pagination value.
 * Numeric strings are accepted; decimals, signs, and other malformed
 * values fall back to the supplied default.
 */
function parseBoundedInteger(value, fallback, min, max) {
  let parsed;

  if (typeof value === 'number') {
    parsed = value;
  } else if (
    typeof value === 'string' &&
    /^\d+$/.test(value.trim())
  ) {
    parsed = Number(value.trim());
  } else {
    return fallback;
  }

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    return fallback;
  }

  return parsed;
}

/**
 * Calculate pagination values from a query object.
 */
function getPagination(query = {}) {
  if (
    query === null ||
    typeof query !== 'object' ||
    Array.isArray(query)
  ) {
    throw new TypeError('Pagination query must be an object.');
  }

  const page = parseBoundedInteger(
    query.page,
    DEFAULT_PAGE,
    1,
    MAX_PAGE
  );

  const limit = parseBoundedInteger(
    query.limit,
    DEFAULT_LIMIT,
    1,
    MAX_LIMIT
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

module.exports = Object.freeze({
  asyncHandler: wrapAsyncHandler,
  sendSuccess,
  httpError,
  getPagination,
});

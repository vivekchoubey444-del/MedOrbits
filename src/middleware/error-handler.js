'use strict';

/**
 * MedOrbits centralized Express error handler.
 *
 * Must be mounted after all API routes and 404 handlers.
 *
 * Security:
 * - Does not expose stack traces in production.
 * - Does not expose internal server-error messages.
 * - Includes request IDs for troubleshooting.
 */

const path = require('node:path');

const SRC_DIR = path.resolve(__dirname, '..');
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

let AppError = null;
let apiResponse = null;

try {
  AppError = require(path.join(SRC_DIR, 'utils', 'app-error'));
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

try {
  apiResponse = require(path.join(SRC_DIR, 'utils', 'api-response'));
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

function getStatusCode(error) {
  const status = Number(
    error.statusCode || error.status || 500
  );

  if (
    !Number.isInteger(status) ||
    status < 400 ||
    status > 599
  ) {
    return 500;
  }

  return status;
}

function classifyError(error, statusCode) {
  if (error.type === 'entity.too.large') {
    return {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body exceeds the allowed size.',
    };
  }

  if (error.type === 'entity.parse.failed') {
    return {
      statusCode: 400,
      code: 'INVALID_JSON',
      message: 'Request body contains invalid JSON.',
    };
  }

  if (error.code === 'CORS_ORIGIN_DENIED') {
    return {
      statusCode: 403,
      code: 'CORS_ORIGIN_DENIED',
      message: 'This origin is not permitted to access the API.',
    };
  }

  if (error.code === '23505') {
    return {
      statusCode: 409,
      code: 'RESOURCE_CONFLICT',
      message: 'A record with the supplied unique value already exists.',
    };
  }

  if (error.code === '23503') {
    return {
      statusCode: 409,
      code: 'RELATED_RESOURCE_CONFLICT',
      message: 'The operation conflicts with a related record.',
    };
  }

  if (error.code === '23502' || error.code === '22P02') {
    return {
      statusCode: 400,
      code: 'INVALID_DATA',
      message: 'One or more supplied values are invalid.',
    };
  }

  const isAppError =
    typeof AppError === 'function' &&
    error instanceof AppError;

  const isServerError = statusCode >= 500;

  return {
    statusCode,
    code: error.code || (
      isServerError
        ? 'INTERNAL_SERVER_ERROR'
        : 'REQUEST_ERROR'
    ),
    message: isServerError
      ? 'An unexpected server error occurred.'
      : error.publicMessage || error.message || 'Request failed.',
    details:
      isAppError && !isServerError
        ? error.details
        : undefined,
  };
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const initialStatus = getStatusCode(error);
  const classified = classifyError(error, initialStatus);
  const statusCode = classified.statusCode;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        requestId: req.id || null,
        method: req.method,
        path: req.path,
        statusCode,
        code: classified.code,
        message: error.message,
        ...(IS_PRODUCTION ? {} : { stack: error.stack }),
      })
    );
  }

  const payload = {
    statusCode,
    code: classified.code,
    message: classified.message,
    details: classified.details,
  };

  /*
   * Support the project's api-response.error(res, payload, req)
   * interface if that method exists.
   */
  if (
    apiResponse &&
    typeof apiResponse.error === 'function'
  ) {
    return apiResponse.error(res, payload, req);
  }

  const response = {
    success: false,
    error: {
      code: payload.code,
      message: payload.message,
    },
    requestId: req.id || null,
  };

  if (
    payload.details !== undefined &&
    !IS_PRODUCTION
  ) {
    response.error.details = payload.details;
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
module.exports.errorHandler = errorHandler;
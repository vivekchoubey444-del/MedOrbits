
'use strict';

/**
 * MedOrbits -- Async Handler
 *
 * File: src/utils/async-handler.js
 *
 * Purpose:
 * - Wrap Express route handlers and middleware.
 * - Forward synchronous exceptions to centralized error middleware.
 * - Forward rejected promises to next(error).
 * - Support standard Express handler arguments.
 *
 * Compatible with CommonJS and Express 4/5.
 */

function asyncHandler(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('asyncHandler requires a function.');
  }

  return function wrappedHandler(req, res, next) {
    try {
      return Promise.resolve(
        handler.call(this, req, res, next)
      ).catch(next);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = asyncHandler;

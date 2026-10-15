'use strict';

function asyncHandler(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError(
      'asyncHandler requires a function.'
    );
  }

  return function wrappedHandler(req, res, next) {
    try {
      return Promise.resolve(
        handler(req, res, next)
      ).catch(next);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = asyncHandler;
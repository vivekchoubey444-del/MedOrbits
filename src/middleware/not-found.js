'use strict';

function notFound(options = {}) {
  return function notFoundMiddleware(req, res, next) {
    if (options.apiOnly === false && req.accepts('html')) {
      const error = new Error('The requested page was not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      error.publicMessage = error.message;
      return next(error);
    }

    return res.status(404).json({
      success: false,
      error: {
        code: options.code || 'NOT_FOUND',
        message: options.message || 'The requested resource was not found.',
      },
      ...(req.id ? { requestId: req.id } : {}),
    });
  };
}

module.exports = notFound;

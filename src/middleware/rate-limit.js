'use strict';

function loadRateLimit() {
  try {
    const mod = require('express-rate-limit');
    return mod.rateLimit || mod.default || mod;
  } catch (error) {
    throw new Error('Rate limiting requires `express-rate-limit`. Install it before enabling these middleware factories.');
  }
}

function createLimiter(options = {}) {
  const rateLimit = loadRateLimit();
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const limit = options.limit ?? 100;

  if (!Number.isInteger(windowMs) || windowMs < 1000) {
    throw new TypeError('windowMs must be an integer of at least 1000.');
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError('limit must be a positive integer.');
  }

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skip: options.skip,
    keyGenerator: options.keyGenerator,
    store: options.store,
    message: {
      success: false,
      error: {
        code: options.code || 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests. Please try again later.',
      },
    },
    handler(req, res, next, config) {
      res.setHeader('Retry-After', String(Math.ceil(config.windowMs / 1000)));
      return res.status(429).json({
        success: false,
        error: {
          code: options.code || 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests. Please try again later.',
        },
        requestId: req.id,
      });
    },
  });
}

module.exports = createLimiter;
module.exports.createLimiter = createLimiter;
module.exports.authLimiter = (options = {}) => createLimiter({
  windowMs: 15 * 60 * 1000, limit: 10, code: 'AUTH_RATE_LIMIT_EXCEEDED',
  message: 'Too many authentication attempts. Try again later.', ...options,
});
module.exports.uploadLimiter = (options = {}) => createLimiter({
  windowMs: 15 * 60 * 1000, limit: 30, code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  message: 'Too many upload requests. Try again later.', ...options,
});

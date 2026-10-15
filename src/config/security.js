'use strict';

const helmet = require('helmet');
const { env } = require('./env');

const securityHeaders = helmet({
  contentSecurityPolicy: env.CONTENT_SECURITY_POLICY_ENABLED
    ? {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", 'https:'],
          upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: env.NODE_ENV === 'production'
    ? { maxAge: 15552000, includeSubDomains: true }
    : false,
});

function securityHeadersMiddleware(req, res, next) {
  if (!env.HELMET_ENABLED) return next();
  return securityHeaders(req, res, next);
}

module.exports = { securityHeadersMiddleware };

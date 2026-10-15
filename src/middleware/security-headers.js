'use strict';

function securityHeaders(options = {}) {
  let helmet;
  try {
    helmet = require('helmet');
  } catch (error) {
    throw new Error('security-headers middleware requires `helmet`. Install it before enabling this middleware.');
  }

  return helmet({
    contentSecurityPolicy: options.contentSecurityPolicy ?? false,
    crossOriginEmbedderPolicy: options.crossOriginEmbedderPolicy ?? false,
    referrerPolicy: options.referrerPolicy || { policy: 'strict-origin-when-cross-origin' },
    hsts: options.hsts ?? (process.env.NODE_ENV === 'production'),
    noSniff: true,
    frameguard: options.frameguard || { action: 'sameorigin' },
    ...options.helmetOptions,
  });
}

module.exports = securityHeaders;

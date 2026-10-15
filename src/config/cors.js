'use strict';

const cors = require('cors');
const { env } = require('./env');

const allowedOrigins = env.CORS_ALLOWED_ORIGINS
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (env.NODE_ENV === 'production' && allowedOrigins.includes('*') && env.CORS_ALLOW_CREDENTIALS) {
  throw new Error('CORS wildcard origins cannot be used with credentials.');
}

const corsOptions = {
  origin(origin, callback) {
    // Requests without Origin may be server-to-server, CLI or same-origin.
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin is not permitted by the CORS policy.'));
  },
  credentials: env.CORS_ALLOW_CREDENTIALS,
  maxAge: env.CORS_MAX_AGE_SECONDS,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token'],
  optionsSuccessStatus: 204,
};

module.exports = { corsMiddleware: cors(corsOptions), corsOptions, allowedOrigins };

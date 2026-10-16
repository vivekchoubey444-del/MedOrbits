‘use strict’;

/**

* MedOrbits -- CORS Configuration
* File: src/config/cors.js
* Responsibilities:
* ●	Enforce the configured cross-origin origin allowlist.
* ●	Support credentialed requests only with explicit origins.
* ●	Configure permitted HTTP methods and request headers.
* ●	Reject malformed origins and unsafe production configuration.
* Expected environment variables:
* ●	CORS_ALLOWED_ORIGINS: comma-separated list of origins.
* ●	CORS_ALLOW_CREDENTIALS: boolean supplied by src/config/env.
* ●	CORS_MAX_AGE_SECONDS: preflight cache duration.
* ●	NODE_ENV: application environment.
        */

const cors = require(‘cors’);
const { env } = require(’./env’);

function normalizeOrigin(value) {
if (typeof value !== ‘string’) {
throw new TypeError(‘CORS origins must be strings.’);
}

const trimmed = value.trim();

if (!trimmed) {
return ‘’;
}

if (trimmed === ‘’) {
return ’’;
}

let parsed;

try {
parsed = new URL(trimmed);
} catch {
throw new Error(Invalid CORS origin configured: "${trimmed}".);
}

if (![‘http:’, ‘https:’].includes(parsed.protocol)) {
throw new Error(
CORS origin must use HTTP or HTTPS: "${trimmed}".
);
}

if (
parsed.username ||
parsed.password ||
parsed.pathname !== ‘/’ ||
parsed.search ||
parsed.hash
) {
throw new Error(
CORS entries must be origins only, without credentials, paths, queries, or fragments: "${trimmed}".
);
}

return parsed.origin;
}

function parseAllowedOrigins(value) {
if (typeof value !== ‘string’ || !value.trim()) {
throw new Error(
‘CORS_ALLOWED_ORIGINS must contain at least one permitted origin.’
);
}

const origins = value
.split(’,’)
.map(normalizeOrigin)
.filter(Boolean);

if (origins.length === 0) {
throw new Error(
‘CORS_ALLOWED_ORIGINS contains no valid origins.’
);
}

if (origins.includes(’*’) && origins.length > 1) {
throw new Error(
‘Do not combine the CORS wildcard with individual origins.’
);
}

return […new Set(origins)];
}

function validateConfiguration(origins) {
if (typeof env.CORS_ALLOW_CREDENTIALS !== ‘boolean’) {
throw new Error(
‘CORS_ALLOW_CREDENTIALS must be a boolean in src/config/env.’
);
}

if (
env.NODE_ENV === ‘production’ &&
origins.includes(’*’) &&
env.CORS_ALLOW_CREDENTIALS
) {
throw new Error(
‘Production CORS cannot use wildcard origins with credentials.’
);
}

if (
env.NODE_ENV === ‘production’ &&
origins.includes(’*’)
) {
throw new Error(
‘Wildcard CORS origins are not permitted in production.’
);
}

const maxAge = env.CORS_MAX_AGE_SECONDS;

if (
!Number.isSafeInteger(maxAge) ||
maxAge < 0
) {
throw new Error(
‘CORS_MAX_AGE_SECONDS must be a non-negative integer.’
);
}
}

const allowedOrigins = parseAllowedOrigins(
env.CORS_ALLOWED_ORIGINS
);

validateConfiguration(allowedOrigins);

const corsOptions = {
origin(origin, callback) {
// Requests without Origin include some CLI and server-to-server clients.
// CORS does not authenticate these requests or replace authorization.
if (!origin) {
return callback(null, true);
}

let normalizedOrigin;
try {
  normalizedOrigin = normalizeOrigin(origin);
} catch {
  return callback(
    new Error('Origin is not permitted by the CORS policy.')
  );
}
if (
  allowedOrigins.includes('*') ||
  allowedOrigins.includes(normalizedOrigin)
) {
  return callback(null, true);
}
return callback(
  new Error('Origin is not permitted by the CORS policy.')
);

},

credentials: env.CORS_ALLOW_CREDENTIALS,

maxAge: env.CORS_MAX_AGE_SECONDS,

methods: [
‘GET’,
‘HEAD’,
‘POST’,
‘PUT’,
‘PATCH’,
‘DELETE’,
‘OPTIONS’,
],

allowedHeaders: [
‘Content-Type’,
‘Authorization’,
‘X-Request-ID’,
‘X-CSRF-Token’,
],

optionsSuccessStatus: 204,
};

const corsMiddleware = cors(corsOptions);

module.exports = {
corsMiddleware,
corsOptions,
allowedOrigins,
};
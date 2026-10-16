‘use strict’;

/**

* MedOrbits -- Environment Configuration
* File: src/config/env.js
* Responsibilities:
* ●	Parse and validate environment variables.
* ●	Apply documented defaults.
* ●	Reject invalid configuration during startup.
* ●	Export a centralized, immutable configuration object.
* Load dotenv in the application entry point before importing this module.
    */

const NODE_ENV = (process.env.NODE_ENV || ‘development’).trim();

const ALLOWED_ENVIRONMENTS = new Set([
‘development’,
‘test’,
‘staging’,
‘production’,
]);

function parseInteger(name, fallback, min, max) {
const raw = process.env[name];

if (raw === undefined || raw === ‘’) {
return fallback;
}

if (!/^\d+$/.test(raw.trim())) {
throw new Error(${name} must be an integer.);
}

const value = Number(raw);

if (!Number.isSafeInteger(value) || value < min || value > max) {
throw new Error(${name} must be between ${min} and ${max}.);
}

return value;
}

function parseBoolean(name, fallback) {
const raw = process.env[name];

if (raw === undefined || raw.trim() === ‘’) {
return fallback;
}

switch (raw.trim().toLowerCase()) {
case ‘true’:
return true;
case ‘false’:
return false;
default:
throw new Error(${name} must be "true" or "false".);
}
}

function parseString(name, fallback = ‘’) {
const raw = process.env[name];

return raw === undefined ? fallback : raw.trim();
}

function parseCsv(name, fallback = ‘’) {
return […new Set(
parseString(name, fallback)
.split(’,’)
.map((item) => item.trim())
.filter(Boolean)
)];
}

function normalizeApiPrefix(value) {
const prefix = value.trim();

if (!prefix.startsWith(’/’)) {
throw new Error(‘API_PREFIX must start with "/".’);
}

if (
prefix === ‘/’ ||
prefix.includes(’?’) ||
prefix.includes(’#’) ||
prefix.includes(’\’) ||
prefix.split(’/’).some((segment) => segment === ‘.’ || segment === ‘..’) ||
/[\u0000-\u001f\u007f]/.test(prefix)
) {
throw new Error(‘API_PREFIX is not a valid API path prefix.’);
}

return prefix.replace(//+$/, ‘’);
}

function validateEnvironment() {
if (!ALLOWED_ENVIRONMENTS.has(NODE_ENV)) {
throw new Error(
NODE_ENV must be one of: ${[...ALLOWED_ENVIRONMENTS].join(', ')}.
);
}
}

validateEnvironment();

const PORT = parseInteger(‘PORT’, 3000, 1, 65535);
const HOST = parseString(‘HOST’, ‘0.0.0.0’);
const API_PREFIX = normalizeApiPrefix(
parseString(‘API_PREFIX’, ‘/api/v1’)
);

if (!HOST) {
throw new Error(‘HOST must not be empty.’);
}

const CORS_ALLOWED_ORIGINS = parseCsv(
‘CORS_ALLOWED_ORIGINS’
);

const CORS_ALLOW_CREDENTIALS = parseBoolean(
‘CORS_ALLOW_CREDENTIALS’,
false
);

const CORS_MAX_AGE_SECONDS = parseInteger(
‘CORS_MAX_AGE_SECONDS’,
600,
0,
86400
);

if (NODE_ENV === ‘production’ && CORS_ALLOWED_ORIGINS.includes(’*’)) {
throw new Error(
‘Wildcard CORS origins are not permitted in production.’
);
}

const DB_CHECK_ON_START = parseBoolean(
‘DB_CHECK_ON_START’,
true
);

const DB_PORT = parseInteger(‘DB_PORT’, 3306, 1, 65535);

const DB_CONNECTION_LIMIT = parseInteger(
‘DB_CONNECTION_LIMIT’,
10,
1,
100
);

const DB_CONNECT_TIMEOUT_MS = parseInteger(
‘DB_CONNECT_TIMEOUT_MS’,
10000,
1000,
120000
);

const EMAIL_ENABLED = parseBoolean(
‘EMAIL_ENABLED’,
false
);

const SMTP_PORT = parseInteger(
‘SMTP_PORT’,
587,
1,
65535
);

const SMTP_SECURE = parseBoolean(
‘SMTP_SECURE’,
false
);

const EMAIL_SEND_TIMEOUT_MS = parseInteger(
‘EMAIL_SEND_TIMEOUT_MS’,
10000,
1000,
120000
);

if (EMAIL_ENABLED) {
const requiredEmailSettings = [
‘SMTP_HOST’,
‘SMTP_USER’,
‘SMTP_PASSWORD’,
‘EMAIL_FROM_ADDRESS’,
];

const missing = requiredEmailSettings.filter(
(name) => !parseString(name)
);

if (missing.length > 0) {
throw new Error(
Email is enabled but required settings are missing: ${missing.join(', ')}.
);
}
}

const env = Object.freeze({
NODE_ENV,
IS_PRODUCTION: NODE_ENV === ‘production’,
IS_DEVELOPMENT: NODE_ENV === ‘development’,
IS_TEST: NODE_ENV === ‘test’,
IS_STAGING: NODE_ENV === ‘staging’,

PORT,
HOST,
API_PREFIX,

CORS_ALLOWED_ORIGINS,
CORS_ALLOW_CREDENTIALS,
CORS_MAX_AGE_SECONDS,

DB_CHECK_ON_START,
DB_PORT,
DB_CONNECTION_LIMIT,
DB_CONNECT_TIMEOUT_MS,

EMAIL_ENABLED,
SMTP_HOST: parseString(‘SMTP_HOST’),
SMTP_PORT,
SMTP_SECURE,
SMTP_USER: parseString(‘SMTP_USER’),
SMTP_PASSWORD: process.env.SMTP_PASSWORD || ‘’,
EMAIL_FROM_NAME: parseString(‘EMAIL_FROM_NAME’, ‘MedOrbits’),
EMAIL_FROM_ADDRESS: parseString(‘EMAIL_FROM_ADDRESS’),
EMAIL_REPLY_TO: parseString(‘EMAIL_REPLY_TO’),
EMAIL_SEND_TIMEOUT_MS,

// Database and application secrets remain sourced from process.env
// by modules that explicitly require them.
});

module.exports = { env };
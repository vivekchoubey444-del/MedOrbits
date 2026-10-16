‘use strict’;

const express = require(‘express’);

const { env } = require(’./config/env’);
const logger = require(’./config/logger’);
const { corsMiddleware } = require(’./config/cors’);
const { securityHeadersMiddleware } = require(’./config/security’);

const app = express();

const SERVICE_NAME = ‘medorbits’;
const API_PREFIX = normalizeApiPrefix(env.API_PREFIX || ‘/api’);

function normalizeApiPrefix(value) {
if (typeof value !== ‘string’ || !value.trim()) {
return ‘/api’;
}

const prefix = /${value.trim().replace(/^\/+|\/+$/g, '')};

if (prefix.includes(’//’) || prefix.includes(’?’) || prefix.includes(’#’)) {
throw new TypeError(‘API_PREFIX must be a valid URL path prefix.’);
}

return prefix;
}

function configureTrustProxy() {
const value = env.TRUST_PROXY;

if (value === undefined || value === null || value === false || value === 0 || value === ‘0’) {
app.set(‘trust proxy’, false);
return;
}

if (value === true || value === 1) {
app.set(‘trust proxy’, 1);
return;
}

if (typeof value === ‘number’ && Number.isSafeInteger(value) && value > 1) {
app.set(‘trust proxy’, value);
return;
}

if (typeof value === ‘string’ && value.trim()) {
app.set(‘trust proxy’, value.trim());
return;
}

throw new TypeError(‘Invalid TRUST_PROXY configuration.’);
}

function log(loggerMethod, fields, message) {
if (typeof loggerMethod === ‘function’) {
loggerMethod.call(logger, fields, message);
}
}

function getRequestPath(req) {
// Avoid logging query parameters, which may contain sensitive data.
return req.path || req.originalUrl.split(’?’)[0];
}

function sendHealthResponse(res) {
return res.status(200).json({
status: ‘ok’,
service: SERVICE_NAME,
timestamp: new Date().toISOString()
});
}

configureTrustProxy();

app.disable(‘x-powered-by’);

app.use(securityHeadersMiddleware);
app.use(corsMiddleware);

// Reject unsupported media types on body-bearing API requests.
app.use((req, res, next) => {
const methodHasBody = ![‘GET’, ‘HEAD’, ‘DELETE’].includes(req.method);
const contentType = req.headers[‘content-type’];

if (
req.path.startsWith(API_PREFIX) &&
methodHasBody &&
req.headers[‘content-length’] !== undefined &&
Number(req.headers[‘content-length’]) > 0 &&
!req.is([
‘application/json’,
‘application/x-www-form-urlencoded’
])
) {
return res.status(415).json({
error: ‘UNSUPPORTED_MEDIA_TYPE’,
message: ‘The request content type is not supported.’
});
}

// Requests without a body remain valid.
if (!contentType && methodHasBody && req.headers[‘content-length’] === undefined) {
return next();
}

return next();
});

app.use(express.json({
limit: ‘1mb’,
strict: true
}));

app.use(express.urlencoded({
extended: false,
limit: ‘1mb’,
parameterLimit: 100
}));

// Request lifecycle logging.
app.use((req, res, next) => {
const startedAt = process.hrtime.bigint();
let logged = false;

const writeRequestLog = () => {
if (logged) return;
logged = true;

const durationMs =
  Number(process.hrtime.bigint() - startedAt) / 1e6;
log(logger.info, {
  event: 'http_request_completed',
  method: req.method,
  path: getRequestPath(req),
  statusCode: res.statusCode,
  durationMs: Math.round(durationMs * 100) / 100,
  requestId: req.id || req.headers['x-request-id'] || undefined
}, 'HTTP request completed');

};

res.on(‘finish’, writeRequestLog);

res.on(‘close’, () => {
if (!res.writableFinished) {
log(logger.warn, {
event: ‘http_request_aborted’,
method: req.method,
path: getRequestPath(req),
requestId: req.id || undefined
}, ‘HTTP request connection closed before completion’);
}
});

next();
});

// Liveness: confirms the application process can respond.
app.get([’/health’, ‘/api/health’], (req, res) => {
return sendHealthResponse(res);
});

// Readiness: replace this baseline check with actual dependency checks.
app.get(’/ready’, async (req, res, next) => {
try {
// TODO: Check required dependencies, such as the database,
// before returning ready. Do not report readiness if a
// required dependency is unavailable.
return res.status(200).json({
status: ‘ready’,
service: SERVICE_NAME,
timestamp: new Date().toISOString()
});
} catch (error) {
return next(error);
}
});

// Mount implemented routes here.
// Example:
// const authRoutes = require(’./routes/auth.routes’);
// app.use(${API_PREFIX}/auth, authRoutes);

// JSON 404 response.
app.use((req, res) => {
return res.status(404).json({
error: ‘NOT_FOUND’,
message: ‘The requested resource was not found.’
});
});

// Centralized error handler.
app.use((error, req, res, next) => {
if (res.headersSent) {
return next(error);
}

const statusCode = Number.isInteger(error.status) &&
error.status >= 400 &&
error.status < 600
? error.status
: Number.isInteger(error.statusCode) &&
error.statusCode >= 400 &&
error.statusCode < 600
? error.statusCode
: error.type === ‘entity.too.large’
? 413
: error.type === ‘entity.parse.failed’
? 400
: 500;

const errorCode = statusCode === 413
? ‘PAYLOAD_TOO_LARGE’
: statusCode === 400
? ‘INVALID_REQUEST’
: statusCode === 401
? ‘UNAUTHORIZED’
: statusCode === 403
? ‘FORBIDDEN’
: statusCode === 404
? ‘NOT_FOUND’
: statusCode === 415
? ‘UNSUPPORTED_MEDIA_TYPE’
: statusCode === 429
? ‘RATE_LIMITED’
: statusCode >= 500
? ‘INTERNAL_SERVER_ERROR’
: ‘REQUEST_ERROR’;

log(
statusCode >= 500 ? logger.error : logger.warn,
{
event: ‘http_request_error’,
method: req.method,
path: getRequestPath(req),
statusCode,
errorType: error.type,
errorName: error.name,
requestId: req.id || undefined
},
‘HTTP request failed’
);

return res.status(statusCode).json({
error: errorCode,
message: statusCode >= 500
? ‘An unexpected error occurred.’
: statusCode === 413
? ‘The request payload exceeds the allowed size.’
: statusCode === 400
? ‘The request body is invalid.’
: statusCode === 401
? ‘Authentication is required.’
: statusCode === 403
? ‘The request is not permitted.’
: statusCode === 404
? ‘The requested resource was not found.’
: statusCode === 415
? ‘The request content type is not supported.’
: statusCode === 429
? ‘Too many requests. Please try again later.’
: ‘The request could not be processed.’
});
});

module.exports = app;
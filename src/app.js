'use strict';

const express = require('express');
const { env } = require('./config/env');
const logger = require('./config/logger');
const { corsMiddleware } = require('./config/cors');
const { securityHeadersMiddleware } = require('./config/security');

const app = express();

app.disable('x-powered-by');

if (env.TRUST_PROXY === true || env.TRUST_PROXY === 1) {
  app.set('trust proxy', 1);
} else if (typeof env.TRUST_PROXY === 'number' && env.TRUST_PROXY > 1) {
  app.set('trust proxy', env.TRUST_PROXY);
} else if (typeof env.TRUST_PROXY === 'string' && env.TRUST_PROXY !== '0') {
  app.set('trust proxy', env.TRUST_PROXY);
}

app.use(securityHeadersMiddleware);
app.use(corsMiddleware);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info({
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    }, 'HTTP request');
  });

  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'medorbits',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'medorbits',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

// Route modules should be mounted here as they are implemented.
// Example:
// const authRoutes = require('./routes/auth.routes');
// app.use(`${env.API_PREFIX}/auth`, authRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested resource was not found.',
  });
});

// Do not expose stack traces or internal exception messages to clients.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  logger.error({
    err: error,
    method: req.method,
    path: req.originalUrl,
  }, 'Unhandled request error');

  const statusCode = Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 600
    ? error.statusCode
    : 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
    message: statusCode === 500
      ? 'An unexpected error occurred.'
      : error.message,
  });
});

module.exports = app;

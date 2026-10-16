
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const { env } = require('./src/config/env');

const ROOT_DIR = __dirname;
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const IS_PRODUCTION = env.NODE_ENV === 'production';
const API_PREFIX = normalizeApiPrefix(env.API_PREFIX || '/api/v1');

const SHUTDOWN_TIMEOUT_MS = positiveInteger(
  env.SHUTDOWN_TIMEOUT_MS,
  15000
);

const app = express();

let server = null;
let shuttingDown = false;
let shutdownPromise = null;
let fatalErrorInProgress = false;

function positiveInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

function normalizeApiPrefix(value) {
  const prefix = `/${String(value).trim()}`
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');

  if (
    prefix === '/' ||
    !/^\/[A-Za-z0-9/_-]+$/.test(prefix) ||
    prefix.includes('//')
  ) {
    throw new Error('API_PREFIX must be a valid absolute URL path.');
  }

  return prefix;
}

function parseTrustProxy(value) {
  const normalized = String(value ?? '0')
    .trim()
    .toLowerCase();

  if (normalized === 'true') return 1;
  if (normalized === 'false' || normalized === '') return false;

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return normalized;
}

function jsonError(
  res,
  status,
  code,
  message,
  requestId,
  extra = {}
) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...extra,
    },
    requestId,
  });
}

function getRequestId(req) {
  const candidate = req.get('x-request-id');

  if (
    typeof candidate === 'string' &&
    /^[A-Za-z0-9._-]{1,128}$/.test(candidate)
  ) {
    return candidate;
  }

  return crypto.randomUUID();
}

function safeRequire(file) {
  if (!fs.existsSync(file)) return null;

  return require(file);
}

function isWebhookPath(pathname) {
  const prefix = API_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const pattern = new RegExp(
    `^${prefix}/(?:payments/webhook|webhooks/(?:razorpay|cashfree|stripe))(?:/|$)`
  );

  return pattern.test(pathname);
}

function isHealthPath(pathname) {
  return new Set([
    '/health',
    '/api/health',
    '/ready',
    `${API_PREFIX}/health`,
    `${API_PREFIX}/ready`,
  ]).has(pathname);
}

app.disable('x-powered-by');
app.set('env', env.NODE_ENV);
app.set('trust proxy', parseTrustProxy(env.TRUST_PROXY));
app.locals.serviceName = 'medorbits';
app.locals.apiPrefix = API_PREFIX;

/*
|--------------------------------------------------------------------------
| Request ID and shutdown guard
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  req.id = getRequestId(req);

  res.setHeader('X-Request-ID', req.id);

  if (shuttingDown && !isHealthPath(req.path)) {
    return jsonError(
      res,
      503,
      'SERVER_SHUTTING_DOWN',
      'The server is temporarily unavailable.',
      req.id
    );
  }

  next();
});

/*
|--------------------------------------------------------------------------
| Security headers
|--------------------------------------------------------------------------
*/

if (env.HELMET_ENABLED !== false) {
  app.use(
    helmet({
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      crossOriginEmbedderPolicy: false,
      ...(env.CONTENT_SECURITY_POLICY_ENABLED === false
        ? { contentSecurityPolicy: false }
        : {}),
    })
  );
}

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = Array.isArray(env.CORS_ALLOWED_ORIGINS)
  ? env.CORS_ALLOWED_ORIGINS
      .map((origin) => String(origin).trim())
      .filter(Boolean)
  : [];

if (
  IS_PRODUCTION &&
  (allowedOrigins.length === 0 || allowedOrigins.includes('*'))
) {
  throw new Error(
    'Production CORS configuration requires explicit allowed origins.'
  );
}

if (
  env.CORS_ALLOW_CREDENTIALS &&
  allowedOrigins.includes('*')
) {
  throw new Error(
    'Credentialed CORS cannot use wildcard origins.'
  );
}

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header are not browser CORS requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error('Origin is not allowed by CORS.');

      error.status = 403;
      error.code = 'CORS_ORIGIN_DENIED';
      error.publicMessage = 'This origin is not allowed.';

      return callback(error);
    },

    credentials: Boolean(env.CORS_ALLOW_CREDENTIALS),

    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-CSRF-Token',
    ],

    exposedHeaders: ['X-Request-ID'],

    maxAge: positiveInteger(env.CORS_MAX_AGE_SECONDS, 600),

    optionsSuccessStatus: 204,
  })
);

app.use(compression());

/*
|--------------------------------------------------------------------------
| Request body parsing
|--------------------------------------------------------------------------
|
| Payment webhooks must be verified against the original request bytes.
| Parse their bodies as raw Buffers before registering the JSON parser.
|
*/

const rawWebhookBodyParser = express.raw({
  type: ['application/json', 'application/*+json'],
  limit: env.REQUEST_BODY_LIMIT || '1mb',
});

app.use((req, res, next) => {
  if (!isWebhookPath(req.path)) {
    return next();
  }

  rawWebhookBodyParser(req, res, (error) => {
    if (error) return next(error);

    if (Buffer.isBuffer(req.body)) {
      req.rawBody = Buffer.from(req.body);
    }

    return next();
  });
});

app.use(
  express.json({
    limit: env.REQUEST_BODY_LIMIT || '1mb',
    strict: true,
    type: ['application/json', 'application/*+json'],
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: env.URLENCODED_BODY_LIMIT || '100kb',
    parameterLimit: 1000,
  })
);

/*
|--------------------------------------------------------------------------
| Structured request logging
|--------------------------------------------------------------------------
*/

if (env.HTTP_LOGGING_ENABLED) {
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();

    res.once('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - start) / 1e6;

      const entry = {
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? 'error' : 'info',
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      };

      console.log(JSON.stringify(entry));
    });

    next();
  });
}

/*
|--------------------------------------------------------------------------
| API rate limiting
|--------------------------------------------------------------------------
*/

if (env.RATE_LIMIT_ENABLED) {
  const rateLimitModule = require('express-rate-limit');

  const rateLimit =
    rateLimitModule.rateLimit ||
    rateLimitModule.default ||
    rateLimitModule;

  app.use(
    API_PREFIX,
    rateLimit({
      windowMs: positiveInteger(
        env.RATE_LIMIT_WINDOW_MS,
        15 * 60 * 1000
      ),

      limit: positiveInteger(
        env.RATE_LIMIT_MAX_REQUESTS,
        100
      ),

      standardHeaders: true,
      legacyHeaders: false,

      handler(req, res) {
        res.setHeader(
          'Retry-After',
          String(
            Math.ceil(
              positiveInteger(
                env.RATE_LIMIT_WINDOW_MS,
                15 * 60 * 1000
              ) / 1000
            )
          )
        );

        return jsonError(
          res,
          429,
          'RATE_LIMIT_EXCEEDED',
          'Too many requests. Please try again later.',
          req.id
        );
      },
    })
  );
}

/*
|--------------------------------------------------------------------------
| Database adapter and health checks
|--------------------------------------------------------------------------
*/

function loadDatabase() {
  return safeRequire(
    path.join(SRC_DIR, 'config', 'database.js')
  );
}

async function checkDatabase() {
  let db;

  try {
    db = loadDatabase();

    if (!db) {
      return {
        configured: false,
        healthy: false,
        reason: 'database_adapter_missing',
      };
    }

    if (typeof db.healthCheck === 'function') {
      await db.healthCheck();
    } else if (typeof db.checkConnection === 'function') {
      await db.checkConnection();
    } else if (typeof db.query === 'function') {
      await db.query('SELECT 1');
    } else if (typeof db.getPool === 'function') {
      const pool = await db.getPool();

      if (!pool || typeof pool.query !== 'function') {
        throw new Error(
          'Database pool does not expose query().'
        );
      }

      await pool.query('SELECT 1');
    } else if (
      db.pool &&
      typeof db.pool.query === 'function'
    ) {
      await db.pool.query('SELECT 1');
    } else {
      return {
        configured: true,
        healthy: false,
        reason: 'database_health_check_not_implemented',
      };
    }

    return {
      configured: true,
      healthy: true,
    };
  } catch {
    return {
      configured: Boolean(db),
      healthy: false,
      reason: 'database_unavailable',
    };
  }
}

/*
|--------------------------------------------------------------------------
| Health and readiness endpoints
|--------------------------------------------------------------------------
*/

if (env.HEALTH_CHECK_ENABLED !== false) {
  app.get(
    ['/health', '/api/health', `${API_PREFIX}/health`],
    (_req, res) => {
      const healthy = !shuttingDown;

      return res.status(healthy ? 200 : 503).json({
        success: healthy,
        service: 'medorbits',
        status: healthy ? 'healthy' : 'shutting-down',
        environment: env.NODE_ENV,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }
  );

  app.get(
    ['/ready', `${API_PREFIX}/ready`],
    async (req, res, next) => {
      if (shuttingDown) {
        return jsonError(
          res,
          503,
          'SERVER_SHUTTING_DOWN',
          'The server is shutting down.',
          req.id
        );
      }

      try {
        const database = await checkDatabase();

        return res
          .status(database.healthy ? 200 : 503)
          .json({
            success: database.healthy,
            status: database.healthy ? 'ready' : 'not-ready',
            dependencies: {
              database,
            },
            requestId: req.id,
          });
      } catch (error) {
        return next(error);
      }
    }
  );
}

/*
|--------------------------------------------------------------------------
| Maintenance mode
|--------------------------------------------------------------------------
*/

if (env.MAINTENANCE_MODE) {
  app.use((req, res, next) => {
    if (isHealthPath(req.path)) {
      return next();
    }

    res.setHeader('Retry-After', '300');

    return jsonError(
      res,
      503,
      'MAINTENANCE_MODE',
      'MedOrbits is temporarily unavailable for maintenance.',
      req.id
    );
  });
}

/*
|--------------------------------------------------------------------------
| API routes
|--------------------------------------------------------------------------
*/

const routesFile = path.join(
  SRC_DIR,
  'routes',
  'index.js'
);

if (!fs.existsSync(routesFile) && IS_PRODUCTION) {
  throw new Error(
    'Required src/routes/index.js is missing.'
  );
}

if (fs.existsSync(routesFile)) {
  const router = require(routesFile);

  if (typeof router !== 'function') {
    throw new TypeError(
      'src/routes/index.js must export an Express Router.'
    );
  }

  app.use(API_PREFIX, router);
}

/*
|--------------------------------------------------------------------------
| Static assets
|--------------------------------------------------------------------------
*/

function mountStatic(prefix, folder) {
  if (!fs.existsSync(folder)) {
    if (IS_PRODUCTION && prefix === '/assets') {
      console.warn(
        '[MedOrbits] Static assets directory is missing.'
      );
    }

    return;
  }

  app.use(
    prefix,
    express.static(folder, {
      index: false,
      dotfiles: 'deny',
      fallthrough: true,
      etag: true,
      maxAge: IS_PRODUCTION ? '1h' : 0,

      setHeaders(res, file) {
        if (/\.(?:html|json|xml|txt)$/i.test(file)) {
          res.setHeader('Cache-Control', 'no-cache');
        }

        if (/\.(?:js|css|svg|png|jpe?g|webp|woff2?)$/i.test(file)) {
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
      },
    })
  );
}

for (const name of [
  'assets',
  'account',
  'admin',
  'career',
  'education',
  'legal',
  'pages',
]) {
  mountStatic(
    `/${name}`,
    path.join(ROOT_DIR, name)
  );
}

/*
|--------------------------------------------------------------------------
| Public metadata
|--------------------------------------------------------------------------
*/

const metadataFiles = [
  'robots.txt',
  'sitemap.xml',
  'ads.txt',
  'humans.txt',
  'manifest.json',
  'browserconfig.xml',
];

for (const name of metadataFiles) {
  const file = path.join(PUBLIC_DIR, name);

  if (!fs.existsSync(file)) continue;

  app.get(`/${name}`, (_req, res, next) => {
    res.sendFile(file, (error) => {
      if (error) next(error);
    });
  });
}

const securityTxt = path.join(
  PUBLIC_DIR,
  '.well-known',
  'security.txt'
);

if (fs.existsSync(securityTxt)) {
  app.get(
    '/.well-known/security.txt',
    (_req, res, next) => {
      res.type('text/plain');

      res.sendFile(securityTxt, (error) => {
        if (error) next(error);
      });
    }
  );
}

/*
|--------------------------------------------------------------------------
| Homepage
|--------------------------------------------------------------------------
*/

app.get('/', (_req, res, next) => {
  const file = path.join(ROOT_DIR, 'index.html');

  if (!fs.existsSync(file)) {
    return res.status(503).send(
      'MedOrbits frontend is not configured.'
    );
  }

  return res.sendFile(file, (error) => {
    if (error) next(error);
  });
});

/*
|--------------------------------------------------------------------------
| 404 handlers
|--------------------------------------------------------------------------
*/

app.use(API_PREFIX, (req, res) => {
  return jsonError(
    res,
    404,
    'API_ROUTE_NOT_FOUND',
    'The requested API endpoint does not exist.',
    req.id
  );
});

app.use((req, res, next) => {
  if (
    ['GET', 'HEAD'].includes(req.method) &&
    req.accepts('html')
  ) {
    const file = path.join(
      ROOT_DIR,
      'pages',
      '404.html'
    );

    if (fs.existsSync(file)) {
      return res.status(404).sendFile(
        file,
        (error) => {
          if (error) next(error);
        }
      );
    }
  }

  return jsonError(
    res,
    404,
    'NOT_FOUND',
    'The requested resource was not found.',
    req.id
  );
});

/*
|--------------------------------------------------------------------------
| Central error handler
|--------------------------------------------------------------------------
*/

const errorHandlerPath = path.join(
  SRC_DIR,
  'middleware',
  'error-handler.js'
);

const configuredErrorHandler = safeRequire(
  errorHandlerPath
);

if (
  configuredErrorHandler !== null &&
  typeof configuredErrorHandler !== 'function'
) {
  throw new TypeError(
    'src/middleware/error-handler.js must export an error-handling middleware function.'
  );
}

app.use(
  configuredErrorHandler ||
    ((error, req, res, next) => {
      if (res.headersSent) {
        return next(error);
      }

      let status =
        Number.isInteger(error.status) &&
        error.status >= 400 &&
        error.status <= 599
          ? error.status
          : 500;

      let code =
        status >= 500
          ? 'INTERNAL_SERVER_ERROR'
          : error.code || 'REQUEST_ERROR';

      let message =
        status >= 500
          ? 'An unexpected server error occurred.'
          : error.publicMessage ||
            error.message ||
            'The request could not be processed.';

      if (error.type === 'entity.too.large') {
        status = 413;
        code = 'PAYLOAD_TOO_LARGE';
        message = 'The request body exceeds the allowed size.';
      } else if (error.type === 'entity.parse.failed') {
        status = 400;
        code = 'INVALID_JSON';
        message = 'The request body contains invalid JSON.';
      } else if (error.type === 'encoding.unsupported') {
        status = 415;
        code = 'UNSUPPORTED_ENCODING';
        message = 'The request body encoding is not supported.';
      } else if (error.type === 'charset.unsupported') {
        status = 415;
        code = 'UNSUPPORTED_CHARSET';
        message = 'The request character set is not supported.';
      }

      if (status >= 500) {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            requestId: req.id,
            message: error.message,
            ...(IS_PRODUCTION
              ? {}
              : { stack: error.stack }),
          })
        );
      }

      return jsonError(
        res,
        status,
        code,
        message,
        req.id
      );
    })
);

/*
|--------------------------------------------------------------------------
| Database and resource cleanup
|--------------------------------------------------------------------------
*/

async function closeResources() {
  const db = loadDatabase();

  if (!db) return;

  if (typeof db.close === 'function') {
    await db.close();
    return;
  }

  if (typeof db.closeDatabase === 'function') {
    await db.closeDatabase();
    return;
  }

  if (typeof db.end === 'function') {
    await db.end();
    return;
  }

  if (
    db.pool &&
    typeof db.pool.end === 'function'
  ) {
    await db.pool.end();
  }
}

/*
|--------------------------------------------------------------------------
| Graceful shutdown
|--------------------------------------------------------------------------
*/

function shutdown(signal = 'shutdown') {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shuttingDown = true;

  console.log(
    `[MedOrbits] ${signal}: graceful shutdown started.`
  );

  shutdownPromise = (async () => {
    let timeout;
    let timedOut = false;

    try {
      const httpClosed = new Promise((resolve, reject) => {
        if (!server || !server.listening) {
          resolve();
          return;
        }

        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });

        if (
          typeof server.closeIdleConnections === 'function'
        ) {
          server.closeIdleConnections();
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        timeout = setTimeout(() => {
          timedOut = true;
          reject(
            new Error('Graceful shutdown timed out.')
          );
        }, SHUTDOWN_TIMEOUT_MS);

        timeout.unref();
      });

      await Promise.race([
        httpClosed,
        timeoutPromise,
      ]);

      await closeResources();
    } catch (error) {
      process.exitCode = 1;

      console.error(
        `[MedOrbits] Shutdown error: ${error.message}`
      );

      if (
        timedOut &&
        server &&
        typeof server.closeAllConnections === 'function'
      ) {
        server.closeAllConnections();
      }

      try {
        await closeResources();
      } catch (cleanupError) {
        console.error(
          `[MedOrbits] Resource cleanup failed: ${cleanupError.message}`
        );
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  })();

  return shutdownPromise;
}

/*
|--------------------------------------------------------------------------
| HTTP server
|--------------------------------------------------------------------------
*/

function startServer() {
  if (server) {
    return server;
  }

  server = http.createServer(app);

  server.requestTimeout = 120_000;
  server.headersTimeout = 65_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 100;

  server.on('error', (error) => {
    process.exitCode = 1;

    console.error(
      `[MedOrbits] HTTP server error: ${error.message}`
    );
  });

  server.listen(
    env.PORT,
    env.HOST,
    () => {
      console.log(
        JSON.stringify({
          service: 'medorbits',
          environment: env.NODE_ENV,
          host: env.HOST,
          port: env.PORT,
          apiPrefix: API_PREFIX,
          pid: process.pid,
        })
      );
    }
  );

  return server;
}

/*
|--------------------------------------------------------------------------
| Process signal and fatal error handlers
|--------------------------------------------------------------------------
*/

async function handleFatalError(label, error) {
  if (fatalErrorInProgress) {
    return;
  }

  fatalErrorInProgress = true;
  process.exitCode = 1;

  console.error(
    `[MedOrbits] ${label}:`,
    error
  );

  await shutdown(label);

  process.exit(1);
}

process.once('SIGTERM', () => {
  shutdown('SIGTERM').then(() => {
    process.exit(process.exitCode || 0);
  });
});

process.once('SIGINT', () => {
  shutdown('SIGINT').then(() => {
    process.exit(process.exitCode || 0);
  });
});

process.once('unhandledRejection', (reason) => {
  const error =
    reason instanceof Error
      ? reason
      : new Error(String(reason));

  void handleFatalError(
    'Unhandled rejection',
    error
  );
});

process.once('uncaughtException', (error) => {
  void handleFatalError(
    'Uncaught exception',
    error
  );
});

/*
|--------------------------------------------------------------------------
| Application entry point
|--------------------------------------------------------------------------
*/

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  shutdown,
  checkDatabase,
};

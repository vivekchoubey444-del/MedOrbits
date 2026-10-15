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
const app = express();
let server = null;
let shuttingDown = false;
let shutdownPromise = null;
function parseTrustProxy(value) {
  const normalized = String(value ?? '0').trim().toLowerCase();
  if (normalized === 'true') return 1;
  if (normalized === 'false' || normalized === '') return false;
  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }
  return normalized;
}
function jsonError(res, status, code, message, requestId, extra = {}) {
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
app.disable('x-powered-by');
app.set('env', env.NODE_ENV);
app.set('trust proxy', parseTrustProxy(env.TRUST_PROXY));
app.locals.serviceName = 'medorbits';
/*
|--------------------------------------------------------------------------
| Request ID and Shutdown Guard
|--------------------------------------------------------------------------
*/
app.use((req, res, next) => {
  const candidate = req.get('x-request-id');
  req.id =
    candidate && /^[A-Za-z0-9._-]{1,128}$/.test(candidate)
      ? candidate
      : crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  if (shuttingDown) {
    return jsonError(
      res,
      503,
      'SERVER_SHUTTING_DOWN',
      'The server is temporarily unavailable.',
      req.id
    );
  }
  return next();
});
/*
|--------------------------------------------------------------------------
| Security Headers
|--------------------------------------------------------------------------
*/
if (env.HELMET_ENABLED) {
  app.use(
    helmet({
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      crossOriginEmbedderPolicy: false,
      ...(env.CONTENT_SECURITY_POLICY_ENABLED
        ? {}
        : { contentSecurityPolicy: false }),
    })
  );
}
/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
*/
if (
  IS_PRODUCTION &&
  (
    !env.CORS_ALLOWED_ORIGINS.length ||
    env.CORS_ALLOWED_ORIGINS.includes('*')
  )
) {
  throw new Error(
    'Production CORS configuration requires explicit allowed origins.'
  );
}
if (
  env.CORS_ALLOW_CREDENTIALS &&
  env.CORS_ALLOWED_ORIGINS.includes('*')
) {
  throw new Error(
    'Credentialed CORS cannot use wildcard origins.'
  );
}
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        env.CORS_ALLOWED_ORIGINS.includes(origin)
      ) {
        return callback(null, true);
      }
      const error = new Error(
        'Origin is not allowed by CORS.'
      );
      error.status = 403;
      error.code = 'CORS_ORIGIN_DENIED';
      error.publicMessage = 'This origin is not allowed.';
      return callback(error);
    },
    credentials: env.CORS_ALLOW_CREDENTIALS,
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
    maxAge: env.CORS_MAX_AGE_SECONDS,
    optionsSuccessStatus: 204,
  })
);
app.use(compression());
/*
|--------------------------------------------------------------------------
| Request Body Parsing
|--------------------------------------------------------------------------
*/
const webhookPath =
  /^\/api\/v1\/(?:payments\/webhook|webhooks\/(?:razorpay|cashfree|stripe))(?:\/|$)/;
app.use(
  express.json({
    limit: env.REQUEST_BODY_LIMIT,
    strict: true,
    type: [
      'application/json',
      'application/*+json',
    ],
    verify(req, _res, buffer) {
      const pathname = req.originalUrl.split('?')[0];
      if (webhookPath.test(pathname)) {
        req.rawBody = Buffer.from(buffer);
      }
    },
  })
);
app.use(
  express.urlencoded({
    extended: false,
    limit: env.URLENCODED_BODY_LIMIT,
    parameterLimit: 1000,
  })
);
/*
|--------------------------------------------------------------------------
| Structured HTTP Logging
|--------------------------------------------------------------------------
*/
if (env.HTTP_LOGGING_ENABLED) {
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.once('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - start) / 1e6;
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: res.statusCode >= 500 ? 'error' : 'info',
          requestId: req.id,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        })
      );
    });
    return next();
  });
}
/*
|--------------------------------------------------------------------------
| API Rate Limiting
|--------------------------------------------------------------------------
*/
if (env.RATE_LIMIT_ENABLED) {
  const rateLimitModule = require('express-rate-limit');
  const rateLimit =
    rateLimitModule.rateLimit ||
    rateLimitModule.default ||
    rateLimitModule;
  app.use(
    env.API_PREFIX,
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      handler(req, res) {
        res.setHeader(
          'Retry-After',
          String(
            Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000)
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
| Database Adapter and Readiness Checks
|--------------------------------------------------------------------------
*/
function loadDatabase() {
  const file = path.join(
    SRC_DIR,
    'config',
    'database.js'
  );
  if (!fs.existsSync(file)) {
    return null;
  }
  return require(file);
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
    if (typeof db.checkConnection === 'function') {
      await db.checkConnection();
      return {
        configured: true,
        healthy: true,
      };
    }
    if (typeof db.query === 'function') {
      await db.query('SELECT 1');
      return {
        configured: true,
        healthy: true,
      };
    }
    return {
      configured: false,
      healthy: false,
      reason: 'database_adapter_not_implemented',
    };
  } catch (_error) {
    return {
      configured: Boolean(db),
      healthy: false,
      reason: 'database_unavailable',
    };
  }
}
/*
|--------------------------------------------------------------------------
| Health and Readiness Endpoints
|--------------------------------------------------------------------------
*/
if (env.HEALTH_CHECK_ENABLED) {
  const live = (_req, res) => {
    return res.status(shuttingDown ? 503 : 200).json({
      success: !shuttingDown,
      service: 'medorbits',
      status: shuttingDown
        ? 'shutting-down'
        : 'healthy',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };
  app.get(
    [
      '/health',
      '/api/health',
      `${env.API_PREFIX}/health`,
    ],
    live
  );
  app.get(
    [
      '/ready',
      `${env.API_PREFIX}/ready`,
    ],
    async (req, res) => {
      if (shuttingDown) {
        return jsonError(
          res,
          503,
          'SERVER_SHUTTING_DOWN',
          'The server is shutting down.',
          req.id
        );
      }
      const database = await checkDatabase();
      return res
        .status(database.healthy ? 200 : 503)
        .json({
          success: database.healthy,
          status: database.healthy
            ? 'ready'
            : 'not-ready',
          dependencies: {
            database,
          },
          requestId: req.id,
        });
    }
  );
}
/*
|--------------------------------------------------------------------------
| Maintenance Mode
|--------------------------------------------------------------------------
*/
if (env.MAINTENANCE_MODE) {
  const healthPaths = new Set([
    '/health',
    '/api/health',
    '/ready',
    `${env.API_PREFIX}/health`,
    `${env.API_PREFIX}/ready`,
  ]);
  app.use((req, res, next) => {
    if (healthPaths.has(req.path)) {
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
| API Routes
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
  app.use(env.API_PREFIX, router);
}
/*
|--------------------------------------------------------------------------
| Static Assets
|--------------------------------------------------------------------------
*/
function mountStatic(prefix, folder) {
  if (!fs.existsSync(folder)) {
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
        if (
          /\.(?:js|css|svg|png|jpe?g|webp|woff2?)$/i.test(file)
        ) {
          res.setHeader(
            'X-Content-Type-Options',
            'nosniff'
          );
        }
      },
    })
  );
}
/*
 * Do not expose the repository root, database files,
 * configuration, source code, uploads, or private storage.
 */
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
| Public Metadata Files
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
  if (fs.existsSync(file)) {
    app.get(`/${name}`, (_req, res, next) => {
      return res.sendFile(
        file,
        (error) => error && next(error)
      );
    });
  }
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
      return res
        .type('text/plain')
        .sendFile(
          securityTxt,
          (error) => error && next(error)
        );
    }
  );
}
/*
|--------------------------------------------------------------------------
| Homepage
|--------------------------------------------------------------------------
*/
app.get('/', (_req, res, next) => {
  const file = path.join(
    ROOT_DIR,
    'index.html'
  );
  if (!fs.existsSync(file)) {
    return res
      .status(503)
      .send('MedOrbits frontend is not configured.');
  }
  return res.sendFile(
    file,
    (error) => error && next(error)
  );
});
/*
|--------------------------------------------------------------------------
| 404 Handlers
|--------------------------------------------------------------------------
*/
app.use(env.API_PREFIX, (req, res) => {
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
        (error) => error && next(error)
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
| Central Error Handler
|--------------------------------------------------------------------------
*/
const errorHandlerPath = path.join(
  SRC_DIR,
  'middleware',
  'error-handler.js'
);
const configuredErrorHandler = fs.existsSync(errorHandlerPath)
  ? require(errorHandlerPath)
  : null;
app.use(
  typeof configuredErrorHandler === 'function'
    ? configuredErrorHandler
    : (error, req, res, next) => {
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
        }
        if (error.type === 'entity.parse.failed') {
          status = 400;
          code = 'INVALID_JSON';
          message = 'The request body contains invalid JSON.';
        }
        if (status >= 500) {
          console.error(
            JSON.stringify({
              level: 'error',
              requestId: req.id,
              message: error.message,
              stack: IS_PRODUCTION
                ? undefined
                : error.stack,
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
      }
);
/*
|--------------------------------------------------------------------------
| Graceful Shutdown
|--------------------------------------------------------------------------
*/
async function closeResources() {
  const db = loadDatabase();
  if (db && typeof db.close === 'function') {
    await db.close();
  } else if (db && typeof db.end === 'function') {
    await db.end();
  }
}
function shutdown(signal = 'shutdown') {
  if (shutdownPromise) {
    return shutdownPromise;
  }
  shuttingDown = true;
  console.log(
    `[MedOrbits] ${signal}: graceful shutdown started.`
  );
  shutdownPromise = new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      console.error(
        '[MedOrbits] Shutdown timeout reached; closing active connections.'
      );
      process.exitCode = 1;
      if (
        server &&
        typeof server.closeAllConnections === 'function'
      ) {
        server.closeAllConnections();
      }
      finish();
    }, env.SHUTDOWN_TIMEOUT_MS);
    timer.unref();
    const closeDb = async () => {
      try {
        await closeResources();
      } catch (error) {
        process.exitCode = 1;
        console.error(
          '[MedOrbits] Resource shutdown failed:',
          error.message
        );
      } finally {
        finish();
      }
    };
    if (!server || !server.listening) {
      void closeDb();
      return;
    }
    server.close((error) => {
      if (error) {
        process.exitCode = 1;
      }
      void closeDb();
    });
    if (
      typeof server.closeIdleConnections === 'function'
    ) {
      server.closeIdleConnections();
    }
  });
  return shutdownPromise;
}
/*
|--------------------------------------------------------------------------
| HTTP Server
|--------------------------------------------------------------------------
*/
function startServer() {
  if (server) {
    return server;
  }
  server = http.createServer(app);
  server.requestTimeout = 60_000;
  server.headersTimeout = 65_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 100;
  server.on('error', (error) => {
    console.error(
      '[MedOrbits] HTTP server error:',
      error.message
    );
    process.exitCode = 1;
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
          apiPrefix: env.API_PREFIX,
          pid: process.pid,
        })
      );
    }
  );
  return server;
}
/*
|--------------------------------------------------------------------------
| Process Signal Handlers
|--------------------------------------------------------------------------
*/
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
  console.error(
    '[MedOrbits] Unhandled rejection:',
    reason
  );
  shutdown('unhandled-rejection').then(() => {
    process.exit(1);
  });
});
process.once('uncaughtException', (error) => {
  console.error(
    '[MedOrbits] Uncaught exception:',
    error
  );
  shutdown('uncaught-exception').then(() => {
    process.exit(1);
  });
});
/*
|--------------------------------------------------------------------------
| Application Entry Point
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
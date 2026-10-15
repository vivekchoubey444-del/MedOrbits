'use strict';

function requestLogger(options = {}) {
  const logger = options.logger || console;
  const shouldLog = options.shouldLog || (() => true);

  return function requestLoggerMiddleware(req, res, next) {
    const start = process.hrtime.bigint();

    res.once('finish', () => {
      if (!shouldLog(req, res)) return;
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const entry = {
        level: res.statusCode >= 500 ? 'error' : 'info',
        timestamp: new Date().toISOString(),
        requestId: req.id || null,
        method: req.method,
        path: req.path, // Intentionally excludes query string.
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        ...(req.user && req.user.id ? { userId: String(req.user.id) } : {}),
      };
      const write = res.statusCode >= 500 ? 'error' : 'log';
      logger[write](JSON.stringify(entry));
    });

    return next();
  };
}

module.exports = requestLogger;

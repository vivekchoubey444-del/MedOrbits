'use strict';

function maintenance(options = {}) {
  const enabled = options.enabled ?? (process.env.MAINTENANCE_MODE === 'true');
  const exemptPaths = new Set(options.exemptPaths || [
    '/health', '/api/health', '/ready', '/health/live', '/health/ready',
  ]);

  return function maintenanceMiddleware(req, res, next) {
    if (!enabled || exemptPaths.has(req.path)) return next();

    res.setHeader('Retry-After', String(options.retryAfterSeconds || 300));

    if (req.path.startsWith(options.apiPrefix || '/api/v1')) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'MAINTENANCE_MODE',
          message: options.message || 'The service is temporarily unavailable for maintenance.',
        },
        ...(req.id ? { requestId: req.id } : {}),
      });
    }

    if (typeof options.htmlHandler === 'function') {
      return options.htmlHandler(req, res, next);
    }

    return res.status(503).send(options.message || 'The service is temporarily unavailable for maintenance.');
  };
}

module.exports = maintenance;

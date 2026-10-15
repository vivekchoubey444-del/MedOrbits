'use strict';

const path = require('node:path');

function notImplemented(feature) {
  return function notImplementedHandler(req, res) {
    return res.status(501).json({
      success: false,
      error: {
        code: 'FEATURE_NOT_IMPLEMENTED',
        message: `${feature} is not implemented yet.`,
      },
      requestId: req.id || null,
    });
  };
}

function loadController(controllerFilename) {
  const controllerPath = path.join(
    __dirname,
    '..',
    'controllers',
    controllerFilename
  );

  try {
    return require(controllerPath);
  } catch (error) {
    if (
      error.code === 'MODULE_NOT_FOUND' &&
      error.message.includes(controllerPath)
    ) {
      return {};
    }
    throw error;
  }
}

function handler(controller, method, feature) {
  if (controller && typeof controller[method] === 'function') {
    return controller[method];
  }
  return notImplemented(feature || method);
}

function asyncHandler(fn) {
  return function wrappedAsyncHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function registerCrudRoutes(router, controller, resourceName, options = {}) {
  const base = options.base || '/';
  const idParam = options.idParam || 'id';

  if (options.list !== false) {
    router.get(base, asyncHandler(handler(controller, 'list', `List ${resourceName}`)));
  }

  if (options.getById !== false) {
    router.get(`${base === '/' ? '' : base}/:${idParam}`,
      asyncHandler(handler(controller, 'getById', `Get ${resourceName}`)));
  }

  if (options.create !== false) {
    router.post(base, asyncHandler(handler(controller, 'create', `Create ${resourceName}`)));
  }

  if (options.update !== false) {
    router.patch(`${base === '/' ? '' : base}/:${idParam}`,
      asyncHandler(handler(controller, 'update', `Update ${resourceName}`)));
  }

  if (options.remove !== false) {
    router.delete(`${base === '/' ? '' : base}/:${idParam}`,
      asyncHandler(handler(controller, 'remove', `Delete ${resourceName}`)));
  }

  return router;
}

module.exports = {
  notImplemented,
  loadController,
  handler,
  asyncHandler,
  registerCrudRoutes,
};

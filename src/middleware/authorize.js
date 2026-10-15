'use strict';

function forbidden(message = 'You do not have permission to perform this action.') {
  const error = new Error(message);
  error.status = 403;
  error.code = 'FORBIDDEN';
  error.publicMessage = message;
  return error;
}

/**
 * authorize({ roles, permissions, requireAllPermissions, ownership })
 * Ownership callback receives (req, user) and must return true when allowed.
 */
function authorize(options = {}) {
  const requiredRoles = options.roles ? [].concat(options.roles) : [];
  const requiredPermissions = options.permissions ? [].concat(options.permissions) : [];

  return async function authorizeMiddleware(req, res, next) {
    if (!req.user) {
      const error = new Error('Authentication is required.');
      error.status = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.publicMessage = error.message;
      return next(error);
    }

    const roles = new Set([].concat(req.user.roles || req.user.role || []).filter(Boolean));
    const permissions = new Set([].concat(req.user.permissions || []).filter(Boolean));

    const roleAllowed = requiredRoles.length === 0 || requiredRoles.some((role) => roles.has(role));
    const permissionAllowed = requiredPermissions.length === 0 ||
      (options.requireAllPermissions
        ? requiredPermissions.every((permission) => permissions.has(permission))
        : requiredPermissions.some((permission) => permissions.has(permission)));

    if (!roleAllowed || !permissionAllowed) return next(forbidden());

    if (typeof options.ownership === 'function') {
      try {
        if (!(await options.ownership(req, req.user))) return next(forbidden());
      } catch (error) {
        return next(error);
      }
    }

    return next();
  };
}

authorize.requireRole = (...roles) => authorize({ roles });
authorize.requirePermission = (...permissions) => authorize({ permissions });
authorize.forbidden = forbidden;

module.exports = authorize;

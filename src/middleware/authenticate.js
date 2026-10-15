'use strict';

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.publicMessage = message;
  return error;
}

/**
 * Verifies a JWT bearer token. Requires `jsonwebtoken`.
 * Options: secret, algorithms, issuer, audience, getUser(decoded, req).
 * `getUser` should load the current user from the database when revocation,
 * disabled accounts, or fresh permissions must be enforced.
 */
function authenticate(options = {}) {
  let jwt;
  try {
    jwt = require('jsonwebtoken');
  } catch (error) {
    throw new Error(
      'authenticate middleware requires `jsonwebtoken`. Install it or provide your session verifier.'
    );
  }

  const secret = options.secret || process.env.JWT_SECRET;
  const algorithms = options.algorithms || ['HS256'];

  if (!secret || (typeof secret === 'string' && secret.length < 32)) {
    throw new Error('JWT_SECRET must be configured and at least 32 characters.');
  }

  return async function authenticateMiddleware(req, res, next) {
    const header = req.get('authorization') || '';
    const match = /^Bearer\s+(\S+)$/i.exec(header);

    if (!match) {
      return next(createHttpError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.'));
    }

    try {
      const decoded = jwt.verify(match[1], secret, {
        algorithms,
        ...(options.issuer ? { issuer: options.issuer } : {}),
        ...(options.audience ? { audience: options.audience } : {}),
        clockTolerance: options.clockTolerance ?? 5,
      });

      if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
        throw createHttpError(401, 'INVALID_TOKEN', 'The access token is invalid.');
      }

      const user = options.getUser
        ? await options.getUser(decoded, req)
        : {
            id: String(decoded.sub),
            roles: Array.isArray(decoded.roles) ? decoded.roles : [],
            permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],
            tokenClaims: decoded,
          };

      if (!user || user.disabled || user.isActive === false) {
        throw createHttpError(401, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.');
      }

      req.user = user;
      req.auth = { tokenId: decoded.jti || null, claims: decoded };
      return next();
    } catch (error) {
      if (error.status) return next(error);
      return next(createHttpError(401, 'INVALID_OR_EXPIRED_TOKEN', 'The access token is invalid or expired.'));
    }
  };
}

module.exports = authenticate;

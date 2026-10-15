'use strict';

const crypto = require('node:crypto');

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function csrf(options = {}) {
  const secret = options.secret || process.env.CSRF_SECRET || process.env.SESSION_SECRET;
  if (!secret || String(secret).length < 32) {
    throw new Error('CSRF_SECRET or SESSION_SECRET must be configured and at least 32 characters.');
  }

  const cookieName = options.cookieName || '__Host-csrf';
  const headerName = (options.headerName || 'x-csrf-token').toLowerCase();
  const safeMethods = new Set(options.safeMethods || ['GET', 'HEAD', 'OPTIONS']);
  const cookieParserRequired = true;

  function signature(token) {
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  function issue(req, res, next) {
    const token = crypto.randomBytes(32).toString('base64url');
    const signed = `${token}.${signature(token)}`;
    res.cookie(cookieName, signed, {
      httpOnly: false,
      secure: options.secure ?? process.env.NODE_ENV === 'production',
      sameSite: options.sameSite || 'lax',
      path: '/',
      ...(options.domain ? { domain: options.domain } : {}),
      maxAge: options.maxAge || 2 * 60 * 60 * 1000,
    });
    res.locals.csrfToken = signed;
    return next();
  }

  function verify(req, res, next) {
    if (safeMethods.has(req.method)) return next();
    if (options.shouldProtect && !options.shouldProtect(req)) return next();

    const cookies = req.cookies || {};
    const cookieToken = cookies[cookieName];
    const headerToken = req.get(headerName);

    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
      const error = new Error('CSRF token is missing or invalid.');
      error.status = 403;
      error.code = 'CSRF_VALIDATION_FAILED';
      error.publicMessage = error.message;
      return next(error);
    }

    const separator = cookieToken.lastIndexOf('.');
    if (separator <= 0) {
      const error = new Error('CSRF token is invalid.');
      error.status = 403;
      error.code = 'CSRF_VALIDATION_FAILED';
      error.publicMessage = error.message;
      return next(error);
    }

    const token = cookieToken.slice(0, separator);
    const suppliedSignature = cookieToken.slice(separator + 1);
    if (!safeEqual(signature(token), suppliedSignature)) {
      const error = new Error('CSRF token is invalid.');
      error.status = 403;
      error.code = 'CSRF_VALIDATION_FAILED';
      error.publicMessage = error.message;
      return next(error);
    }

    return next();
  }

  return { issue, verify, cookieName, cookieParserRequired };
}

module.exports = csrf;
module.exports.safeEqual = safeEqual;

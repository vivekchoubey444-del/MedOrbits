'use strict';

const crypto = require('node:crypto');

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

function requestId(options = {}) {
  const headerName = options.headerName || 'x-request-id';

  return function requestIdMiddleware(req, res, next) {
    const supplied = req.get(headerName);
    const id = supplied && REQUEST_ID_PATTERN.test(supplied)
      ? supplied
      : crypto.randomUUID();

    req.id = id;
    res.setHeader('X-Request-ID', id);
    return next();
  };
}

module.exports = requestId;
module.exports.REQUEST_ID_PATTERN = REQUEST_ID_PATTERN;

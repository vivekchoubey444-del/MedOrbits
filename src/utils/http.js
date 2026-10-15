'use strict';

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sendSuccess(res, data, status = 200, extra = {}) {
  return res.status(status).json({
    success: true,
    data,
    ...extra,
  });
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.publicMessage = message;
  return error;
}

function getPagination(query = {}) {
  const page = Math.max(1, Math.min(1000000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { asyncHandler, sendSuccess, httpError, getPagination };

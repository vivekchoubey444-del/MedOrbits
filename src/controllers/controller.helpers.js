'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');

function idFrom(req) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError(400, 'INVALID_ID', 'A valid positive ID is required.');
  }
  return id;
}

function requireUser(req) {
  if (!req.user || !req.user.id) {
    throw httpError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }
  return req.user;
}

function unavailable(feature) {
  throw httpError(501, 'FEATURE_NOT_CONFIGURED', `${feature} is not configured yet.`);
}

function crudController(repository, validator, options = {}) {
  const writable = options.writable !== false;
  const removeAllowed = options.removeAllowed !== false;

  return {
    list: asyncHandler(async (req, res) => {
      const result = await repository.list(req.query);
      return sendSuccess(res, result.items, 200, { pagination: result.pagination });
    }),
    get: asyncHandler(async (req, res) => {
      const item = await repository.findById(idFrom(req));
      if (!item) throw httpError(404, 'NOT_FOUND', 'Record not found.');
      return sendSuccess(res, item);
    }),
    create: asyncHandler(async (req, res) => {
      if (!writable) unavailable('Create');
      const data = validator ? validator.validate(req.body) : req.body;
      const item = await repository.create(data);
      return sendSuccess(res, item, 201);
    }),
    update: asyncHandler(async (req, res) => {
      if (!writable) unavailable('Update');
      const data = validator ? validator.validate(req.body) : req.body;
      const item = await repository.update(idFrom(req), data);
      if (!item) throw httpError(404, 'NOT_FOUND', 'Record not found.');
      return sendSuccess(res, item);
    }),
    remove: asyncHandler(async (req, res) => {
      if (!removeAllowed) unavailable('Delete');
      const removed = await repository.remove(idFrom(req));
      if (!removed) throw httpError(404, 'NOT_FOUND', 'Record not found.');
      return sendSuccess(res, { deleted: true });
    }),
  };
}

module.exports = { idFrom, requireUser, unavailable, crudController };

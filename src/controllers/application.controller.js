
'use strict';

const {
  asyncHandler,
  sendSuccess,
  httpError,
} = require('../utils/http');
const { requireUser } = require('./controller.helpers');

const repository = require('../repositories/application.repository');
const validator = require('../validators/application.validator');

const controller = {};

function parseId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError(
      400,
      'INVALID_ID',
      'A valid positive integer ID is required.'
    );
  }

  return id;
}

function validateBody(body) {
  if (!validator || typeof validator.validate !== 'function') {
    throw httpError(
      503,
      'VALIDATOR_UNAVAILABLE',
      'Application validation is not configured.'
    );
  }

  return validator.validate(body);
}

function authenticatedUserId(req) {
  const user = requireUser(req);
  const id = Number(user.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'The authenticated user is invalid.'
    );
  }

  return id;
}

function canReadAny(req) {
  const user = req.user;
  const roles = [].concat(user.roles || user.role || []);
  const permissions = [].concat(user.permissions || []);

  return roles.includes('admin') || permissions.includes('applications:read:any');
}

function assertOwnerOrAdmin(req, application, userId) {
  if (
    !canReadAny(req) &&
    Number(application.user_id) !== userId
  ) {
    throw httpError(404, 'NOT_FOUND', 'Application not found.');
  }
}

/**
 * GET /applications
 * List applications with repository-supported filters.
 */
controller.list = asyncHandler(async (req, res) => {
  const userId = authenticatedUserId(req);
  const result = await repository.list({
    ...req.query,
    ...(!canReadAny(req) ? { user_id: userId } : {}),
  });

  if (!result || !Array.isArray(result.items)) {
    throw httpError(
      500,
      'INVALID_REPOSITORY_RESPONSE',
      'The application repository returned an invalid list response.'
    );
  }

  return sendSuccess(
    res,
    result.items,
    200,
    result.pagination
      ? { pagination: result.pagination }
      : {}
  );
});

/**
 * GET /applications/:id
 * Retrieve an application by ID.
 */
controller.get = asyncHandler(async (req, res) => {
  const userId = authenticatedUserId(req);
  const id = parseId(req.params.id);
  const item = await repository.findById(id);

  if (!item) {
    throw httpError(
      404,
      'NOT_FOUND',
      'Application not found.'
    );
  }

  assertOwnerOrAdmin(req, item, userId);

  return sendSuccess(res, item);
});

/**
 * POST /applications
 * Validate and create an application.
 */
controller.create = asyncHandler(async (req, res) => {
  const userId = authenticatedUserId(req);

  if (
    Object.prototype.hasOwnProperty.call(req.body || {}, 'user_id') ||
    Object.prototype.hasOwnProperty.call(req.body || {}, 'status')
  ) {
    throw httpError(
      400,
      'PROTECTED_FIELDS',
      'user_id and status are assigned by the server.'
    );
  }

  const data = validateBody(req.body);
  const item = await repository.create({
    ...data,
    user_id: userId,
    status: 'draft',
  });

  if (!item) {
    throw httpError(
      500,
      'APPLICATION_CREATE_FAILED',
      'The application could not be created.'
    );
  }

  return sendSuccess(res, item, 201);
});

/**
 * PUT/PATCH /applications/:id
 * Validate and update an application.
 */
controller.update = asyncHandler(async (req, res) => {
  const userId = authenticatedUserId(req);
  const id = parseId(req.params.id);
  const existing = await repository.findById(id);

  if (!existing) {
    throw httpError(404, 'NOT_FOUND', 'Application not found.');
  }

  assertOwnerOrAdmin(req, existing, userId);

  if (
    Object.prototype.hasOwnProperty.call(req.body || {}, 'user_id') ||
    Object.prototype.hasOwnProperty.call(req.body || {}, 'status')
  ) {
    throw httpError(
      400,
      'PROTECTED_FIELDS',
      'user_id and status cannot be changed through this endpoint.'
    );
  }

  const data = validateBody(req.body);
  const item = await repository.update(id, data);

  if (!item) {
    throw httpError(
      404,
      'NOT_FOUND',
      'Application not found.'
    );
  }

  return sendSuccess(res, item);
});

/**
 * DELETE /applications/:id
 * Delete an application.
 */
controller.remove = asyncHandler(async (req, res) => {
  const userId = authenticatedUserId(req);
  const id = parseId(req.params.id);
  const existing = await repository.findById(id);

  if (!existing) {
    throw httpError(404, 'NOT_FOUND', 'Application not found.');
  }

  assertOwnerOrAdmin(req, existing, userId);

  if (!canReadAny(req) && existing.status !== 'draft') {
    throw httpError(
      409,
      'INVALID_STATE',
      'Only draft applications can be deleted.'
    );
  }

  const removed = await repository.remove(id);

  if (!removed) {
    throw httpError(
      404,
      'NOT_FOUND',
      'Application not found.'
    );
  }

  return sendSuccess(res, {
    id,
    deleted: true,
  });
});

controller.listMine = controller.list;
controller.getById = controller.get;

module.exports = controller;

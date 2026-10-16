
'use strict';

const {
  asyncHandler,
  sendSuccess,
  httpError,
} = require('../utils/http');

const repository = require('../repositories/user.repository');
const validator = require('../validators/auth.validator');

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
      'Request validation is not configured.'
    );
  }

  return validator.validate(body);
}

/**
 * GET /users
 * List users using repository-supported filters and pagination.
 */
controller.list = asyncHandler(async (req, res) => {
  const result = await repository.list(req.query);

  if (!result || !Array.isArray(result.items)) {
    throw httpError(
      500,
      'INVALID_REPOSITORY_RESPONSE',
      'The user repository returned an invalid list response.'
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
 * GET /users/:id
 * Retrieve a user by ID.
 */
controller.get = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const item = await repository.findById(id);

  if (!item) {
    throw httpError(
      404,
      'NOT_FOUND',
      'User not found.'
    );
  }

  return sendSuccess(res, item);
});

/**
 * POST /users
 * Validate and create a user.
 */
controller.create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body);
  const item = await repository.create(data);

  if (!item) {
    throw httpError(
      500,
      'USER_CREATE_FAILED',
      'The user could not be created.'
    );
  }

  return sendSuccess(res, item, 201);
});

/**
 * PUT/PATCH /users/:id
 * Validate and update a user.
 */
controller.update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = validateBody(req.body);

  const item = await repository.update(id, data);

  if (!item) {
    throw httpError(
      404,
      'NOT_FOUND',
      'User not found.'
    );
  }

  return sendSuccess(res, item);
});

/**
 * DELETE /users/:id
 * Remove a user.
 */
controller.remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const removed = await repository.remove(id);

  if (!removed) {
    throw httpError(
      404,
      'NOT_FOUND',
      'User not found.'
    );
  }

  return sendSuccess(res, {
    id,
    deleted: true,
  });
});

module.exports = controller;

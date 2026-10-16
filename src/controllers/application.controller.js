
'use strict';

const {
  asyncHandler,
  sendSuccess,
  httpError,
} = require('../utils/http');

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

/**
 * GET /applications
 * List applications with repository-supported filters.
 */
controller.list = asyncHandler(async (req, res) => {
  const result = await repository.list(req.query);

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
  const id = parseId(req.params.id);
  const item = await repository.findById(id);

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
 * POST /applications
 * Validate and create an application.
 */
controller.create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body);
  const item = await repository.create(data);

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
  const id = parseId(req.params.id);
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
  const id = parseId(req.params.id);
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

module.exports = controller;

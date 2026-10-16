
'use strict';

const {
  asyncHandler,
  sendSuccess,
  httpError,
} = require('../utils/http');

const repository = require('../repositories/college.repository');
const validator = require('../validators/college.validator');

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
      'College validation is not configured.'
    );
  }

  return validator.validate(body);
}

/**
 * GET /colleges
 * List colleges using repository-supported filters and pagination.
 */
controller.list = asyncHandler(async (req, res) => {
  const result = await repository.list(req.query);

  if (!result || !Array.isArray(result.items)) {
    throw httpError(
      500,
      'INVALID_REPOSITORY_RESPONSE',
      'The college repository returned an invalid list response.'
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
 * GET /colleges/:id
 * Retrieve a college by ID.
 */
controller.get = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const college = await repository.findById(id);

  if (!college) {
    throw httpError(
      404,
      'NOT_FOUND',
      'College not found.'
    );
  }

  return sendSuccess(res, college);
});

/**
 * POST /colleges
 * Validate and create a college.
 */
controller.create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body);
  const college = await repository.create(data);

  if (!college) {
    throw httpError(
      500,
      'COLLEGE_CREATE_FAILED',
      'The college could not be created.'
    );
  }

  return sendSuccess(res, college, 201);
});

/**
 * PUT/PATCH /colleges/:id
 * Validate and update a college.
 */
controller.update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = validateBody(req.body);

  const college = await repository.update(id, data);

  if (!college) {
    throw httpError(
      404,
      'NOT_FOUND',
      'College not found.'
    );
  }

  return sendSuccess(res, college);
});

/**
 * DELETE /colleges/:id
 * Remove a college.
 */
controller.remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const removed = await repository.remove(id);

  if (!removed) {
    throw httpError(
      404,
      'NOT_FOUND',
      'College not found.'
    );
  }

  return sendSuccess(res, {
    id,
    deleted: true,
  });
});

module.exports = controller;

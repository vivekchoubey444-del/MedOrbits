
'use strict';

const {
  asyncHandler,
  sendSuccess,
  httpError,
} = require('../utils/http');

const repository = require('../repositories/candidate.repository');
const validator = require('../validators/candidate.validator');

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
      'Candidate validation is not configured.'
    );
  }

  return validator.validate(body);
}

/**
 * GET /candidates
 * List candidates with repository-supported filters and pagination.
 */
controller.list = asyncHandler(async (req, res) => {
  const result = await repository.list(req.query);

  if (!result || !Array.isArray(result.items)) {
    throw httpError(
      500,
      'INVALID_REPOSITORY_RESPONSE',
      'The candidate repository returned an invalid list response.'
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
 * GET /candidates/:id
 * Retrieve a candidate by ID.
 */
controller.get = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const candidate = await repository.findById(id);

  if (!candidate) {
    throw httpError(
      404,
      'NOT_FOUND',
      'Candidate not found.'
    );
  }

  return sendSuccess(res, candidate);
});

/**
 * POST /candidates
 * Validate and create a candidate.
 */
controller.create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body);
  const candidate = await repository.create(data);

  if (!candidate) {
    throw httpError(
      500,
      'CANDIDATE_CREATE_FAILED',
      'The candidate could not be created.'
    );
  }

  return sendSuccess(res, candidate, 201);
});

/**
 * PUT/PATCH /candidates/:id
 * Validate and update a candidate.
 */
controller.update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = validateBody(req.body);

  const candidate = await repository.update(id, data);

  if (!candidate) {
    throw httpError(
      404,
      'NOT_FOUND',
      'Candidate not found.'
    );
  }

  return sendSuccess(res, candidate);
});

/**
 * DELETE /candidates/:id
 * Remove a candidate.
 */
controller.remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const removed = await repository.remove(id);

  if (!removed) {
    throw httpError(
      404,
      'NOT_FOUND',
      'Candidate not found.'
    );
  }

  return sendSuccess(res, {
    id,
    deleted: true,
  });
});

module.exports = controller;

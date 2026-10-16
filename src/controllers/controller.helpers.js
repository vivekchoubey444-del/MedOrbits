
'use strict';

const {
  asyncHandler,
  sendSuccess,
  httpError,
} = require('../utils/http');

/**
 * Parse a positive integer route ID.
 */
function idFrom(req) {
  const value = req.params?.id;

  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value)
  ) {
    throw httpError(
      400,
      'INVALID_ID',
      'A valid positive integer ID is required.'
    );
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id)) {
    throw httpError(
      400,
      'INVALID_ID',
      'A valid positive integer ID is required.'
    );
  }

  return id;
}

/**
 * Require an authenticated user.
 * Authentication middleware must populate req.user.
 */
function requireUser(req) {
  if (
    !req.user ||
    (typeof req.user.id !== 'string' &&
      typeof req.user.id !== 'number') ||
    String(req.user.id).trim() === ''
  ) {
    throw httpError(
      401,
      'UNAUTHENTICATED',
      'Authentication is required.'
    );
  }

  return req.user;
}

/**
 * Return a consistent not-configured error.
 */
function unavailable(feature) {
  const name =
    typeof feature === 'string' && feature.trim()
      ? feature.trim()
      : 'This feature';

  throw httpError(
    501,
    'FEATURE_NOT_CONFIGURED',
    `${name} is not configured yet.`
  );
}

/**
 * Validate request data.
 * Validators must expose validate(body).
 */
function validateBody(validator, body) {
  if (
    !validator ||
    typeof validator.validate !== 'function'
  ) {
    throw httpError(
      503,
      'VALIDATOR_UNAVAILABLE',
      'Request validation is not configured.'
    );
  }

  return validator.validate(body);
}

/**
 * Create standard CRUD handlers.
 *
 * Repository contract:
 *   list(query) -> { items: [], pagination?: object }
 *   findById(id)
 *   create(data)
 *   update(id, data)
 *   remove(id)
 *
 * Options:
 *   writable: false       disables create and update
 *   removeAllowed: false  disables delete
 *   validate: false       permits raw request bodies
 *
 * Validation is enabled by default when a validator is supplied.
 */
function crudController(repository, validator, options = {}) {
  if (
    !repository ||
    typeof repository !== 'object'
  ) {
    throw new TypeError(
      'crudController requires a repository object.'
    );
  }

  if (typeof repository.list !== 'function') {
    throw new TypeError(
      'Repository must implement list(query).'
    );
  }

  if (typeof repository.findById !== 'function') {
    throw new TypeError(
      'Repository must implement findById(id).'
    );
  }

  const writable = options.writable !== false;
  const removeAllowed = options.removeAllowed !== false;
  const validationEnabled = options.validate !== false;

  function getData(body) {
    if (!validationEnabled) {
      return body;
    }

    return validateBody(validator, body);
  }

  return {
    /**
     * GET collection
     */
    list: asyncHandler(async (req, res) => {
      const result = await repository.list(req.query);

      if (
        !result ||
        !Array.isArray(result.items)
      ) {
        throw httpError(
          500,
          'INVALID_REPOSITORY_RESPONSE',
          'The repository returned an invalid list response.'
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
    }),

    /**
     * GET resource by ID
     */
    get: asyncHandler(async (req, res) => {
      const item = await repository.findById(idFrom(req));

      if (!item) {
        throw httpError(
          404,
          'NOT_FOUND',
          'Record not found.'
        );
      }

      return sendSuccess(res, item);
    }),

    /**
     * POST collection
     */
    create: asyncHandler(async (req, res) => {
      if (!writable) {
        unavailable('Create');
      }

      if (typeof repository.create !== 'function') {
        unavailable('Create');
      }

      const data = getData(req.body);
      const item = await repository.create(data);

      if (!item) {
        throw httpError(
          500,
          'CREATE_FAILED',
          'The record could not be created.'
        );
      }

      return sendSuccess(res, item, 201);
    }),

    /**
     * PUT/PATCH resource by ID
     */
    update: asyncHandler(async (req, res) => {
      if (!writable) {
        unavailable('Update');
      }

      if (typeof repository.update !== 'function') {
        unavailable('Update');
      }

      const id = idFrom(req);
      const data = getData(req.body);
      const item = await repository.update(id, data);

      if (!item) {
        throw httpError(
          404,
          'NOT_FOUND',
          'Record not found.'
        );
      }

      return sendSuccess(res, item);
    }),

    /**
     * DELETE resource by ID
     */
    remove: asyncHandler(async (req, res) => {
      if (!removeAllowed) {
        unavailable('Delete');
      }

      if (typeof repository.remove !== 'function') {
        unavailable('Delete');
      }

      const id = idFrom(req);
      const removed = await repository.remove(id);

      if (!removed) {
        throw httpError(
          404,
          'NOT_FOUND',
          'Record not found.'
        );
      }

      return sendSuccess(res, {
        id,
        deleted: true,
      });
    }),
  };
}

module.exports = {
  idFrom,
  requireUser,
  unavailable,
  crudController,
};

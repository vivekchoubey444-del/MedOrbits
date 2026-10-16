
'use strict';

const {
  asyncHandler,
  sendSuccess,
  httpError,
} = require('../utils/http');

const userRepository = require('../repositories/user.repository');

const controller = {};

function parseId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError(
      400,
      'INVALID_ID',
      'A valid positive integer user ID is required.'
    );
  }

  return id;
}

function getOptionalMethod(target, methodName) {
  return target && typeof target[methodName] === 'function'
    ? target[methodName].bind(target)
    : null;
}

/**
 * GET /admin/overview
 *
 * Returns high-level administrative statistics.
 *
 * Add an admin repository with an overview() method to enable
 * database-backed statistics. No fake counts are returned.
 */
controller.overview = asyncHandler(async (_req, res) => {
  const adminRepository = require('../repositories/admin.repository');
  const getOverview = getOptionalMethod(
    adminRepository,
    'overview'
  );

  if (!getOverview) {
    throw httpError(
      503,
      'ADMIN_OVERVIEW_UNAVAILABLE',
      'The admin overview service is not configured.'
    );
  }

  const overview = await getOverview();

  if (!overview || typeof overview !== 'object') {
    throw httpError(
      500,
      'INVALID_ADMIN_OVERVIEW',
      'The admin overview service returned an invalid response.'
    );
  }

  return sendSuccess(res, overview);
});

/**
 * GET /admin/users
 *
 * Lists users using the existing user repository.
 * Supports only the filtering and pagination parameters
 * implemented by userRepository.list().
 */
controller.listUsers = asyncHandler(async (req, res) => {
  const result = await userRepository.list(req.query);

  if (!result || !Array.isArray(result.items)) {
    throw httpError(
      500,
      'INVALID_USER_LIST',
      'The user repository returned an invalid response.'
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
 * PATCH /admin/users/:id/status
 *
 * Updates a user's status.
 *
 * Requires userRepository.updateStatus(id, status).
 * The allowed status values must match your database schema
 * and account lifecycle policy.
 */
controller.updateUserStatus = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (
    !req.body ||
    typeof req.body.status !== 'string' ||
    !req.body.status.trim()
  ) {
    throw httpError(
      400,
      'INVALID_STATUS',
      'A valid status is required.'
    );
  }

  const status = req.body.status.trim();

  const updateStatus = getOptionalMethod(
    userRepository,
    'updateStatus'
  );

  if (!updateStatus) {
    throw httpError(
      503,
      'USER_STATUS_UPDATE_UNAVAILABLE',
      'User status updates are not configured.'
    );
  }

  const updatedUser = await updateStatus(id, status);

  if (!updatedUser) {
    throw httpError(
      404,
      'NOT_FOUND',
      'User not found.'
    );
  }

  return sendSuccess(res, updatedUser);
});

module.exports = controller;

'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { requireUser } = require('./controller.helpers');
const validator = require('../validators/password.validator');
const passwordService = require('../services/password.service');

const controller = {};

/**
 * PATCH /auth/password/change
 * Change the password for the authenticated user.
 */
controller.change = asyncHandler(async (req, res) => {
  const user = requireUser(req);

  if (!validator || typeof validator.validateChange !== 'function') {
    throw httpError(
      500,
      'PASSWORD_VALIDATOR_MISCONFIGURED',
      'Password change validation is not configured.'
    );
  }

  const data = validator.validateChange(req.body);

  if (typeof passwordService.changePassword !== 'function') {
    throw httpError(
      500,
      'PASSWORD_SERVICE_MISCONFIGURED',
      'Password change is not configured.'
    );
  }

  await passwordService.changePassword({
    userId: user.id,
    currentPassword: data.currentPassword,
    newPassword: data.newPassword,
  });

  return sendSuccess(res, {
    message: 'Password changed successfully.',
  });
});

/**
 * POST /auth/password/reset/request
 * Request a password-reset email.
 */
controller.requestReset = asyncHandler(async (req, res) => {
  if (!validator || typeof validator.validateResetRequest !== 'function') {
    throw httpError(
      500,
      'PASSWORD_VALIDATOR_MISCONFIGURED',
      'Password-reset validation is not configured.'
    );
  }

  const data = validator.validateResetRequest(req.body);

  if (typeof passwordService.requestPasswordReset !== 'function') {
    throw httpError(
      500,
      'PASSWORD_SERVICE_MISCONFIGURED',
      'Password-reset requests are not configured.'
    );
  }

  await passwordService.requestPasswordReset({
    email: data.email,
  });

  // Avoid revealing whether an account exists.
  return sendSuccess(res, {
    message: 'If an account matches that email, password-reset instructions will be sent.',
  });
});

/**
 * POST /auth/password/reset
 * Reset a password using a single-use token.
 */
controller.reset = asyncHandler(async (req, res) => {
  if (!validator || typeof validator.validateReset !== 'function') {
    throw httpError(
      500,
      'PASSWORD_VALIDATOR_MISCONFIGURED',
      'Password-reset validation is not configured.'
    );
  }

  const data = validator.validateReset(req.body);

  if (typeof passwordService.resetPassword !== 'function') {
    throw httpError(
      500,
      'PASSWORD_SERVICE_MISCONFIGURED',
      'Password reset is not configured.'
    );
  }

  await passwordService.resetPassword({
    token: data.token,
    newPassword: data.newPassword,
  });

  return sendSuccess(res, {
    message: 'Password reset successfully.',
  });
});

module.exports = controller;
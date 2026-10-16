
'use strict';

const {
  asyncHandler,
  sendSuccess,
  httpError,
} = require('../utils/http');

const validator = require('../validators/verification.validator');
const { unavailable } = require('./controller.helpers');

const controller = {};

/**
 * POST /verification/request
 *
 * Validates and initiates a verification request.
 * The verification service must generate, store and deliver
 * the verification code using the configured channel.
 */
controller.request = asyncHandler(async (req, res) => {
  if (!validator || typeof validator.validateRequest !== 'function') {
    unavailable('Verification request validation');
  }

  const validation = await validator.validateRequest(req.body);

  if (!validation || validation.error) {
    throw httpError(
      400,
      'INVALID_VERIFICATION_REQUEST',
      validation?.error?.message ||
        'The verification request is invalid.'
    );
  }

  // Connect this controller to your verification service.
  unavailable('Verification request service');

  return sendSuccess(res, {
    message: 'Verification request accepted.',
  }, 202);
});

/**
 * POST /verification/confirm
 *
 * Validates and confirms a verification code.
 * The verification service must check expiry, attempts,
 * ownership and one-time use before marking the target verified.
 */
controller.confirm = asyncHandler(async (req, res) => {
  if (!validator || typeof validator.validateConfirm !== 'function') {
    unavailable('Verification confirmation validation');
  }

  const validation = await validator.validateConfirm(req.body);

  if (!validation || validation.error) {
    throw httpError(
      400,
      'INVALID_VERIFICATION_CONFIRMATION',
      validation?.error?.message ||
        'The verification confirmation is invalid.'
    );
  }

  // Connect this controller to your verification service.
  unavailable('Verification confirmation service');

  return sendSuccess(res, {
    message: 'Verification confirmed.',
  });
});

module.exports = controller;


'use strict';

const {
  asyncHandler,
  sendSuccess,
  httpError,
} = require('../utils/http');

const validator = require('../validators/contact.validator');
const repository = require('../repositories/contact.repository');

const controller = {};

/**
 * POST /contact
 *
 * Validates and stores a contact enquiry.
 *
 * Expected validator contract:
 *   validator.validate(req.body)
 *
 * Expected repository contract:
 *   repository.create(validatedData)
 */
controller.create = asyncHandler(async (req, res) => {
  if (!validator || typeof validator.validate !== 'function') {
    throw httpError(
      503,
      'VALIDATOR_UNAVAILABLE',
      'Contact form validation is not configured.'
    );
  }

  if (!repository || typeof repository.create !== 'function') {
    throw httpError(
      503,
      'CONTACT_SERVICE_UNAVAILABLE',
      'The contact service is not configured.'
    );
  }

  const data = validator.validate(req.body);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw httpError(
      400,
      'INVALID_CONTACT_REQUEST',
      'Please provide valid contact information.'
    );
  }

  const result = await repository.create(data);

  if (!result) {
    throw httpError(
      500,
      'CONTACT_CREATE_FAILED',
      'Your message could not be submitted. Please try again later.'
    );
  }

  return sendSuccess(
    res,
    {
      message: 'Your enquiry has been submitted successfully.',
      id: result.id ?? undefined,
    },
    201
  );
});

module.exports = controller;

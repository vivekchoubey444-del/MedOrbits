
'use strict';

/**
 * MedOrbits -- Request Controller
 *
 * File: src/controllers/request.controller.js
 *
 * Purpose:
 * - Handle request-submission HTTP operations.
 * - Validate request data before processing.
 * - Use the established API response contract.
 * - Delegate asynchronous errors to centralized middleware.
 * - Fail closed while request processing is unconfigured.
 */

const asyncHandler = require('../utils/async-handler');
const apiResponse = require('../utils/api-response');
const requestValidator = require('../validators/request.validator');

const SERVICE_UNAVAILABLE_CODE = 'REQUEST_SERVICE_NOT_CONFIGURED';

const SERVICE_UNAVAILABLE_MESSAGE =
  'Request submission is not available yet. Please try again later.';

const CREATE_FIELDS = Object.freeze([
  'name',
  'email',
  'phone',
  'subject',
  'message',
  'category',
  'source',
]);

const QUERY_FIELDS = Object.freeze([
  'page',
  'limit',
  'status',
  'category',
]);

const UPDATE_FIELDS = Object.freeze([
  'status',
  'assigned_to',
  'internal_notes',
]);

function sendUnavailable(res) {
  return apiResponse.sendError(
    res,
    501,
    SERVICE_UNAVAILABLE_CODE,
    SERVICE_UNAVAILABLE_MESSAGE
  );
}

function validateId(value) {
  return requestValidator.validateRouteId(value, {
    field: 'id',
  });
}

/**
 * POST /requests
 *
 * Validate a prospective guidance or consultancy request.
 * Persistence remains disabled until the service is configured.
 */
const createRequest = asyncHandler(async (req, res) => {
  requestValidator.validateBody(req.body, {
    allowedFields: CREATE_FIELDS,
    rejectUnknown: true,
  });

  requestValidator.validateRequiredFields(
    req.body,
    ['name', 'email', 'message'],
    { field: 'body' }
  );

  return sendUnavailable(res);
});

/**
 * GET /requests
 *
 * Validate list filters. Authorization and retrieval remain disabled.
 */
const listRequests = asyncHandler(async (req, res) => {
  requestValidator.validateQuery(req.query, {
    allowedFields: QUERY_FIELDS,
    rejectUnknown: true,
  });

  requestValidator.validatePagination(req.query, {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  });

  return sendUnavailable(res);
});

/**
 * GET /requests/:id
 *
 * Validate the identifier. Resource access remains disabled.
 */
const getRequestById = asyncHandler(async (req, res) => {
  validateId(req.params.id);

  return sendUnavailable(res);
});

/**
 * PATCH /requests/:id
 *
 * Validate the identifier and permitted update-field structure.
 * Business rules and state transitions are not implemented here.
 */
const updateRequest = asyncHandler(async (req, res) => {
  validateId(req.params.id);

  requestValidator.validateBody(req.body, {
    allowedFields: UPDATE_FIELDS,
    rejectUnknown: true,
  });

  requestValidator.validateRequiredFields(
    req.body,
    Object.keys(req.body),
    { field: 'body' }
  );

  return sendUnavailable(res);
});

/**
 * DELETE /requests/:id
 *
 * Validate the identifier. Deletion remains disabled.
 */
const deleteRequest = asyncHandler(async (req, res) => {
  validateId(req.params.id);

  return sendUnavailable(res);
});

module.exports = Object.freeze({
  createRequest,
  listRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
});

'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');
const repository = require('../repositories/payment.repository');
const validator = require('../validators/payment.validator');

const controller = {};
controller.list = asyncHandler(async (req, res) => {
  const result = await repository.list(req.query);
  return sendSuccess(res, result.items, 200, { pagination: result.pagination });
});

controller.get = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'INVALID_ID', 'A valid ID is required.');
  const item = await repository.findById(id);
  if (!item) throw httpError(404, 'NOT_FOUND', 'Record not found.');
  return sendSuccess(res, item);
});

controller.create = asyncHandler(async (req, res) => {
  unavailable('Payment creation');
});

controller.update = asyncHandler(async (req, res) => {
  unavailable('Payment updates');
});

controller.remove = asyncHandler(async (req, res) => {
  unavailable('Payment deletion');
});

controller.webhook = asyncHandler(async (req, res) => {
  /* Verify the payment provider signature using req.rawBody before processing. */
  unavailable('Payment webhook signature verification');
});

module.exports = controller;

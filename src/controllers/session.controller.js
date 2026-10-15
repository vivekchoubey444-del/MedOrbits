'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');
const validator = null;
const repository = require('../repositories/session.repository');

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
  const data = validator ? validator.validate(req.body) : req.body;
  const item = await repository.create(data);
  return sendSuccess(res, item, 201);
});

controller.update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'INVALID_ID', 'A valid ID is required.');
  const data = validator ? validator.validate(req.body) : req.body;
  const item = await repository.update(id, data);
  if (!item) throw httpError(404, 'NOT_FOUND', 'Record not found.');
  return sendSuccess(res, item);
});

controller.remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'INVALID_ID', 'A valid ID is required.');
  const removed = await repository.remove(id);
  if (!removed) throw httpError(404, 'NOT_FOUND', 'Record not found.');
  return sendSuccess(res, { deleted: true });
});

module.exports = controller;

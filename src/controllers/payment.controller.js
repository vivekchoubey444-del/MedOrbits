'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { idFrom, requireUser, unavailable } = require('./controller.helpers');
const repository = require('../repositories/payment.repository');
const validator = require('../validators/payment.validator');
const paymentService = require('../services/payment.service');

const controller = {};

/**
 * GET /payments
 * List payments visible to the authenticated user.
 */
controller.list = asyncHandler(async (req, res) => {
  const user = requireUser(req);

  if (typeof repository.listForUser !== 'function') {
    unavailable('User-scoped payment listing');
  }

  const result = await repository.listForUser(user.id, req.query);

  if (
    !result ||
    !Array.isArray(result.items) ||
    !result.pagination
  ) {
    throw httpError(
      500,
      'INVALID_REPOSITORY_RESPONSE',
      'The payment repository returned an invalid list response.'
    );
  }

  return sendSuccess(res, result.items, 200, {
    pagination: result.pagination,
  });
});

/**
 * GET /payments/:id
 * Retrieve a payment belonging to the authenticated user.
 */
controller.get = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const id = idFrom(req);

  if (typeof repository.findForUser !== 'function') {
    unavailable('User-scoped payment retrieval');
  }

  const payment = await repository.findForUser(id, user.id);

  if (!payment) {
    throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  }

  return sendSuccess(res, payment);
});

/**
 * POST /payments
 * Create a payment through the configured payment service.
 */
controller.create = asyncHandler(async (req, res) => {
  const user = requireUser(req);

  if (!validator || typeof validator.validateCreate !== 'function') {
    unavailable('Payment creation validation');
  }

  if (typeof paymentService.createPayment !== 'function') {
    unavailable('Payment creation service');
  }

  const data = validator.validateCreate(req.body);

  // The service must calculate the payable amount from trusted records.
  // Never trust a client-supplied amount or payment status.
  const payment = await paymentService.createPayment({
    userId: user.id,
    data,
  });

  return sendSuccess(res, payment, 201);
});

/**
 * PATCH /payments/:id
 * Payment status and amounts must be controlled by trusted services
 * and verified provider events, not arbitrary client updates.
 */
controller.update = asyncHandler(async (req, _res) => {
  requireUser(req);
  unavailable('Direct payment updates');
});

/**
 * DELETE /payments/:id
 * Financial records should not be deleted through a generic endpoint.
 */
controller.remove = asyncHandler(async (req, _res) => {
  requireUser(req);
  unavailable('Payment deletion');
});

/**
 * POST /payments/webhook
 * Verify the provider signature against the exact raw request body
 * before accepting or processing any event.
 */
controller.webhook = asyncHandler(async (req, res) => {
  if (!Buffer.isBuffer(req.rawBody)) {
    throw httpError(
      400,
      'RAW_BODY_REQUIRED',
      'The raw request body is required for webhook verification.'
    );
  }

  if (typeof paymentService.processWebhook !== 'function') {
    unavailable('Payment webhook processing');
  }

  /*
   * The service must:
   * 1. Verify the provider signature using the raw body and provider secret.
   * 2. Reject invalid signatures.
   * 3. Validate the event and merchant/account identity.
   * 4. Process events idempotently to prevent duplicate payment handling.
   * 5. Update payment state only after verification.
   */
  const result = await paymentService.processWebhook({
    rawBody: req.rawBody,
    headers: req.headers,
  });

  return sendSuccess(res, result || { received: true });
});

module.exports = controller;
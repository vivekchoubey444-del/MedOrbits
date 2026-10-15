'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('payment.controller.js');

// Mounted at /api/v1/payments

router.post('/checkout', asyncHandler(handler(controller, 'createCheckout', 'Create payment checkout')));
router.get('/mine', asyncHandler(handler(controller, 'listMine', 'List my payments')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get payment')));
router.post('/webhook', asyncHandler(handler(controller, 'webhook', 'Process payment webhook')));

module.exports = router;

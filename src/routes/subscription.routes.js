'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('subscription.controller.js');

// Mounted at /api/v1/subscriptions

router.get('/plans', asyncHandler(handler(controller, 'plans', 'List subscription plans')));
router.post('/', asyncHandler(handler(controller, 'create', 'Create subscription')));
router.get('/mine', asyncHandler(handler(controller, 'mine', 'Get my subscription')));
router.post('/:id/cancel', asyncHandler(handler(controller, 'cancel', 'Cancel subscription')));

module.exports = router;

'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('verification.controller.js');

// Mounted at /api/v1/verification

router.post('/email/send', asyncHandler(handler(controller, 'sendEmail', 'Send email verification')));
router.post('/email/confirm', asyncHandler(handler(controller, 'confirmEmail', 'Confirm email verification')));
router.post('/phone/send', asyncHandler(handler(controller, 'sendPhone', 'Send phone verification')));
router.post('/phone/confirm', asyncHandler(handler(controller, 'confirmPhone', 'Confirm phone verification')));
router.get('/status', asyncHandler(handler(controller, 'status', 'Get verification status')));

module.exports = router;

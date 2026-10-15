'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('password.controller.js');

// Mounted at /api/v1/password

router.post('/forgot', asyncHandler(handler(controller, 'forgot', 'Request password reset')));
router.post('/reset', asyncHandler(handler(controller, 'reset', 'Reset password')));
router.post('/change', asyncHandler(handler(controller, 'change', 'Change password')));

module.exports = router;

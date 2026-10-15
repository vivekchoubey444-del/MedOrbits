'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('auth.controller.js');

// Mounted at /api/v1/auth

router.post('/register', asyncHandler(handler(controller, 'register', 'Register account')));
router.post('/login', asyncHandler(handler(controller, 'login', 'Log in')));
router.post('/logout', asyncHandler(handler(controller, 'logout', 'Log out')));
router.post('/refresh', asyncHandler(handler(controller, 'refresh', 'Refresh session')));
router.get('/me', asyncHandler(handler(controller, 'me', 'Get current account')));

module.exports = router;

'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('session.controller.js');

// Mounted at /api/v1/session

router.get('/', asyncHandler(handler(controller, 'list', 'List sessions')));
router.delete('/:id', asyncHandler(handler(controller, 'revoke', 'Revoke session')));
router.delete('/', asyncHandler(handler(controller, 'revokeAll', 'Revoke all sessions')));

module.exports = router;

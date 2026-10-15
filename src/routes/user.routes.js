'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('user.controller.js');

// Mounted at /api/v1/users

router.get('/', asyncHandler(handler(controller, 'list', 'List users')));
router.get('/me', asyncHandler(handler(controller, 'me', 'Get current user')));
router.patch('/me', asyncHandler(handler(controller, 'updateMe', 'Update current user')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get user')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update user')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete user')));

module.exports = router;

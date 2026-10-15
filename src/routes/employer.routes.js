'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('employer.controller.js');

// Mounted at /api/v1/employers

router.post('/register', asyncHandler(handler(controller, 'register', 'Register employer')));
router.post('/login', asyncHandler(handler(controller, 'login', 'Employer login')));
router.get('/me', asyncHandler(handler(controller, 'me', 'Get employer profile')));
router.patch('/me', asyncHandler(handler(controller, 'updateMe', 'Update employer profile')));
router.get('/', asyncHandler(handler(controller, 'list', 'List employers')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get employer')));

module.exports = router;

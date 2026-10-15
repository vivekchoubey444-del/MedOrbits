'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('candidate.controller.js');

// Mounted at /api/v1/candidates

router.get('/me', asyncHandler(handler(controller, 'me', 'Get candidate profile')));
router.patch('/me', asyncHandler(handler(controller, 'updateMe', 'Update candidate profile')));
router.get('/', asyncHandler(handler(controller, 'list', 'List candidates')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get candidate')));

module.exports = router;

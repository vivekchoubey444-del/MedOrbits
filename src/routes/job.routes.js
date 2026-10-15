'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('job.controller.js');

// Mounted at /api/v1/jobs

router.get('/', asyncHandler(handler(controller, 'list', 'List jobs')));
router.get('/categories', asyncHandler(handler(controller, 'categories', 'List job categories')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get job')));
router.post('/', asyncHandler(handler(controller, 'create', 'Create job')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update job')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete job')));

module.exports = router;

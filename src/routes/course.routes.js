'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('course.controller.js');

// Mounted at /api/v1/courses

router.get('/', asyncHandler(handler(controller, 'list', 'List courses')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get course')));
router.post('/', asyncHandler(handler(controller, 'create', 'Create course')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update course')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete course')));

module.exports = router;

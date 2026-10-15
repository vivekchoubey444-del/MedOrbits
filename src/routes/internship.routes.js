'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('internship.controller.js');

// Mounted at /api/v1/internships

router.get('/', asyncHandler(handler(controller, 'list', 'List internships')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get internship')));
router.post('/', asyncHandler(handler(controller, 'create', 'Create internship')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update internship')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete internship')));

module.exports = router;

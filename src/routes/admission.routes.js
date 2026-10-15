'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('admission.controller.js');

// Mounted at /api/v1/admissions

router.get('/', asyncHandler(handler(controller, 'list', 'List admission information')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get admission information')));
router.post('/', asyncHandler(handler(controller, 'create', 'Create admission information')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update admission information')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete admission information')));

module.exports = router;

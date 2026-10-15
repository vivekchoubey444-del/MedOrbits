'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('college.controller.js');

// Mounted at /api/v1/colleges

router.get('/', asyncHandler(handler(controller, 'list', 'List colleges')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get college')));
router.post('/', asyncHandler(handler(controller, 'create', 'Create college')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update college')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete college')));

module.exports = router;

'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('university.controller.js');

// Mounted at /api/v1/universities

router.get('/', asyncHandler(handler(controller, 'list', 'List universities')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get university')));
router.post('/', asyncHandler(handler(controller, 'create', 'Create university')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update university')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete university')));

module.exports = router;

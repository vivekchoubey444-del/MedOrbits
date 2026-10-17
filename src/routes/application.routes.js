'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('application.controller.js');

// Mounted at /api/v1/applications

router.get('/', asyncHandler(handler(controller, 'list', 'List applications')));
router.get('/mine', asyncHandler(handler(controller, 'listMine', 'List my applications')));
router.post('/', asyncHandler(handler(controller, 'create', 'Create application')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get application')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update application')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete application')));

module.exports = router;

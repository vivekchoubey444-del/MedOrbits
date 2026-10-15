'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('application.controller.js');

// Mounted at /api/v1/applications

router.post('/', asyncHandler(handler(controller, 'create', 'Submit application')));
router.get('/mine', asyncHandler(handler(controller, 'listMine', 'List my applications')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get application')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update application')));
router.post('/:id/submit', asyncHandler(handler(controller, 'submit', 'Submit application for review')));
router.post('/:id/withdraw', asyncHandler(handler(controller, 'withdraw', 'Withdraw application')));

module.exports = router;

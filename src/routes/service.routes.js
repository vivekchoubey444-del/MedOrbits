'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('service.controller.js');

// Mounted at /api/v1/services

router.get('/', asyncHandler(handler(controller, 'list', 'List services')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get service')));
router.post('/requests', asyncHandler(handler(controller, 'createRequest', 'Create service request')));
router.get('/requests/mine', asyncHandler(handler(controller, 'listMyRequests', 'List my service requests')));

module.exports = router;

'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('recruitment.controller.js');

// Mounted at /api/v1/recruitment

router.post('/requests', asyncHandler(handler(controller, 'create', 'Create recruitment request')));
router.get('/requests', asyncHandler(handler(controller, 'list', 'List recruitment requests')));
router.get('/requests/:id', asyncHandler(handler(controller, 'getById', 'Get recruitment request')));
router.patch('/requests/:id', asyncHandler(handler(controller, 'update', 'Update recruitment request')));

module.exports = router;

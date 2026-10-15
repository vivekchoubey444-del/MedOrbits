'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('counselling.controller.js');

// Mounted at /api/v1/counselling

router.post('/requests', asyncHandler(handler(controller, 'createRequest', 'Create counselling request')));
router.get('/requests/mine', asyncHandler(handler(controller, 'listMine', 'List my counselling requests')));
router.get('/requests/:id', asyncHandler(handler(controller, 'getById', 'Get counselling request')));
router.patch('/requests/:id', asyncHandler(handler(controller, 'update', 'Update counselling request')));
router.post('/appointments', asyncHandler(handler(controller, 'bookAppointment', 'Book counselling appointment')));

module.exports = router;

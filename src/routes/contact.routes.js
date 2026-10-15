'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('contact.controller.js');

// Mounted at /api/v1/contact

router.post('/', asyncHandler(handler(controller, 'create', 'Submit contact message')));
router.get('/', asyncHandler(handler(controller, 'list', 'List contact messages')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get contact message')));
router.patch('/:id/status', asyncHandler(handler(controller, 'updateStatus', 'Update contact message status')));

module.exports = router;

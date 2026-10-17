'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('faq.controller.js');

// Mounted at /api/v1/faqs

router.post('/answer', asyncHandler(handler(controller, 'answer', 'Answer FAQ question')));
router.get('/', asyncHandler(handler(controller, 'list', 'List FAQs')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get FAQ')));
router.post('/', asyncHandler(handler(controller, 'create', 'Create FAQ')));
router.patch('/:id', asyncHandler(handler(controller, 'update', 'Update FAQ')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete FAQ')));

module.exports = router;

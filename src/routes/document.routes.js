'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('document.controller.js');

// Mounted at /api/v1/documents

router.post('/', asyncHandler(handler(controller, 'create', 'Create document record')));
router.get('/mine', asyncHandler(handler(controller, 'listMine', 'List my documents')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get document')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete document')));
router.post('/:id/verify', asyncHandler(handler(controller, 'verify', 'Verify document')));

module.exports = router;

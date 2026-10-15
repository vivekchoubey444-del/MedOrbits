'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('upload.controller.js');

// Mounted at /api/v1/uploads

router.post('/', asyncHandler(handler(controller, 'create', 'Upload file')));
router.get('/:id', asyncHandler(handler(controller, 'getById', 'Get upload metadata')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete upload')));

module.exports = router;

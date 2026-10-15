'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('search.controller.js');

// Mounted at /api/v1/search

router.get('/', asyncHandler(handler(controller, 'search', 'Search MedOrbits')));
router.get('/courses', asyncHandler(handler(controller, 'courses', 'Search courses')));
router.get('/colleges', asyncHandler(handler(controller, 'colleges', 'Search colleges')));
router.get('/jobs', asyncHandler(handler(controller, 'jobs', 'Search jobs')));

module.exports = router;

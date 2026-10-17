'use strict';

const express = require('express');
const { asyncHandler } = require('./route-utils');
const controller = require('../controllers/public-release.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));

module.exports = router;
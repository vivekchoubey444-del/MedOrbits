'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');
const validator = require('../validators/verification.validator');

const controller = {};

controller.request = asyncHandler(async (req, res) => {
  unavailable('Verification request');
});

controller.confirm = asyncHandler(async (req, res) => {
  unavailable('Verification confirm');
});

module.exports = controller;

'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');
const validator = require('../validators/password.validator');

const controller = {};

controller.change = asyncHandler(async (req, res) => {
  unavailable('Password change');
});

controller.requestReset = asyncHandler(async (req, res) => {
  unavailable('Password requestReset');
});

controller.reset = asyncHandler(async (req, res) => {
  unavailable('Password reset');
});

module.exports = controller;

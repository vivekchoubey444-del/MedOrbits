'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');

const controller = {};

controller.list = asyncHandler(async (req, res) => {
  unavailable('Service list');
});

controller.get = asyncHandler(async (req, res) => {
  unavailable('Service get');
});

module.exports = controller;

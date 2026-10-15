'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');

const controller = {};

controller.search = asyncHandler(async (req, res) => {
  unavailable('Search search');
});

module.exports = controller;

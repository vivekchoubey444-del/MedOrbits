'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');

const controller = {};

controller.list = asyncHandler(async (req, res) => {
  unavailable('Faq list');
});

controller.get = asyncHandler(async (req, res) => {
  unavailable('Faq get');
});

module.exports = controller;

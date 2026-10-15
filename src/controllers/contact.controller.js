'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');
const validator = require('../validators/contact.validator');

const controller = {};

controller.create = asyncHandler(async (req, res) => {
  unavailable('Contact creation');
});

module.exports = controller;

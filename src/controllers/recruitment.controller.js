'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');

const controller = {};

controller.list = asyncHandler(async (req, res) => {
  unavailable('Recruitment list');
});

controller.create = asyncHandler(async (req, res) => {
  unavailable('Recruitment creation');
});

controller.get = asyncHandler(async (req, res) => {
  unavailable('Recruitment get');
});

controller.update = asyncHandler(async (req, res) => {
  unavailable('Recruitment update');
});

module.exports = controller;

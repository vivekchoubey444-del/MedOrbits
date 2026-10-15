'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');

const controller = {};

controller.list = asyncHandler(async (req, res) => {
  unavailable('Counselling list');
});

controller.create = asyncHandler(async (req, res) => {
  unavailable('Counselling creation');
});

controller.get = asyncHandler(async (req, res) => {
  unavailable('Counselling get');
});

controller.update = asyncHandler(async (req, res) => {
  unavailable('Counselling update');
});

module.exports = controller;

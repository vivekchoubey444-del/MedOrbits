'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');

const controller = {};

controller.list = asyncHandler(async (req, res) => {
  unavailable('Notification list');
});

controller.get = asyncHandler(async (req, res) => {
  unavailable('Notification get');
});

controller.markRead = asyncHandler(async (req, res) => {
  unavailable('Notification markRead');
});

module.exports = controller;

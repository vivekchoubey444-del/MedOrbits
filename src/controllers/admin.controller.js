'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');

const controller = {};

controller.overview = asyncHandler(async (req, res) => {
  unavailable('Admin overview');
});

controller.listUsers = asyncHandler(async (req, res) => {
  unavailable('Admin listUsers');
});

controller.updateUserStatus = asyncHandler(async (req, res) => {
  unavailable('Admin updateUserStatus');
});

module.exports = controller;

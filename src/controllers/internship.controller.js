
'use strict';

const {
  crudController,
} = require('./controller.helpers');

const repository = require('../repositories/internship.repository');
const validator = require('../validators/internship.validator');

const controller = crudController(
  repository,
  validator,
  {
    writable: true,
    removeAllowed: false,
  }
);

module.exports = controller;

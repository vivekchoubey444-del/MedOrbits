
'use strict';

const {
  crudController,
} = require('./controller.helpers');

const repository = require('../repositories/employer.repository');
const validator = require('../validators/employer.validator');

const controller = crudController(
  repository,
  validator,
  {
    writable: true,
    removeAllowed: false,
  }
);

module.exports = controller;

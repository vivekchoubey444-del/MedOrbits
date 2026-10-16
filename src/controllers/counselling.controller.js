
'use strict';

const {
  crudController,
} = require('./controller.helpers');

const repository = require('../repositories/counselling.repository');
const validator = require('../validators/counselling.validator');

const controller = crudController(
  repository,
  validator,
  {
    writable: true,
    removeAllowed: false,
  }
);

module.exports = controller;

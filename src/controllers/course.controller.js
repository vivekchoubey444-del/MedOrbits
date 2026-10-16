
'use strict';

const {
  crudController,
} = require('./controller.helpers');

const repository = require('../repositories/course.repository');
const validator = require('../validators/course.validator');

const controller = crudController(
  repository,
  validator,
  {
    writable: true,
    removeAllowed: false,
  }
);

module.exports = controller;

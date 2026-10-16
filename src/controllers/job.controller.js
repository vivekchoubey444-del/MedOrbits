  
'use strict';

const {
  crudController,
} = require('./controller.helpers');

const repository = require('../repositories/job.repository');
const validator = require('../validators/job.validator');

const controller = crudController(
  repository,
  validator,
  {
    writable: true,
    removeAllowed: false,
  }
);

module.exports = controller;

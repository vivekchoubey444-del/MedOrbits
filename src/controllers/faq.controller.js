
'use strict';

const {
  crudController,
} = require('./controller.helpers');

const repository = require('../repositories/faq.repository');

const controller = crudController(
  repository,
  null,
  {
    writable: false,
    removeAllowed: false,
    validate: false,
  }
);

module.exports = controller;

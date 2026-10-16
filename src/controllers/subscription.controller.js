'use strict';

const { crudController } = require('./controller.helpers');
const repository = require('../repositories/subscription.repository');
const validator = require('../validators/subscription.validator');

const controller = crudController(repository, validator, {
  writable: true,
  removeAllowed: false,
});

module.exports = {
  list: controller.list,
  get: controller.get,
  create: controller.create,
  update: controller.update,
};
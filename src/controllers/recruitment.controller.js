'use strict';

const { crudController } = require('./controller.helpers');
const repository = require('../repositories/recruitment.repository');
const validator = require('../validators/recruitment.validator');

const controller = crudController(repository, validator, {
  writable: true,
  removeAllowed: false,
});

module.exports = {
  list: controller.list,
  create: controller.create,
  get: controller.get,
  update: controller.update,
};
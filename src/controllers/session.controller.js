'use strict';

const { crudController } = require('./controller.helpers');
const repository = require('../repositories/session.repository');
const validator = require('../validators/session.validator');

const controller = crudController(repository, validator, {
  writable: true,
  removeAllowed: false,
});

// Keep session records accessible only through authenticated routes.
// For user-specific sessions, use repository methods scoped to userId.
module.exports = {
  list: controller.list,
  get: controller.get,
  create: controller.create,
  update: controller.update,
};
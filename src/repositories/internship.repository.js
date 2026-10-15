'use strict';
const { createRepository } = require('./base.repository');
const model = require('../models/internship.model');
module.exports = createRepository({ table: model.TABLE, columns: model.COLUMNS, searchable: model.SEARCHABLE, defaultOrder: model.DEFAULT_ORDER });

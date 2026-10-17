'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { sendSuccess, getPagination } = require('../utils/http');
const { listPublicReleases } = require('../services/public-releases.service');

const DATA_DIR = path.join(__dirname, '..', '..', 'assets', 'data');

function readCollection(filename, collection) {
  const file = path.join(DATA_DIR, filename);
  const dataset = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(dataset[collection])) {
    throw new TypeError(`${filename} must contain a ${collection} array.`);
  }
  return dataset[collection];
}

async function list(req, res) {
  const pagination = getPagination(req.query);
  const releases = listPublicReleases({
    news: readCollection('news.json', 'news'),
    bulletins: readCollection('bulletins.json', 'bulletins'),
  });
  const page = (items) => items.slice(pagination.offset, pagination.offset + pagination.limit);

  return sendSuccess(res, {
    notices: page(releases.notices),
    bulletins: page(releases.bulletins),
  }, 200, {
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: {
        notices: releases.notices.length,
        bulletins: releases.bulletins.length,
      },
    },
  });
}

module.exports = { list };
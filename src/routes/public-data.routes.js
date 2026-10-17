'use strict';

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { asyncHandler } = require('./route-utils');
const { httpError, sendSuccess } = require('../utils/http');

const router = express.Router();
const DATA_DIR = path.resolve(__dirname, '..', '..', 'assets', 'data');
const PUBLIC_DATASETS = Object.freeze({
  'admission-process': ['processes'],
  admissions: ['admissions'],
  categories: ['categories'],
  'career-options': ['careerOptions'],
  colleges: ['colleges'],
  courses: ['courses'],
  countries: ['countries'],
  documents: ['documents'],
  'entrance-exams': ['exams'],
  faqs: ['faqs'],
  'fee-guides': ['documents'],
  fees: ['fees'],
  hostels: ['hostels'],
  internships: ['internships'],
  jobs: ['jobs'],
  locations: ['countries', 'states', 'cities'],
  news: ['news'],
  notifications: ['notifications'],
  recruitment: ['recruitments'],
  scholarships: ['scholarships'],
  sectors: ['sectors'],
  services: ['services'],
  testimonials: ['testimonials'],
  universities: ['universities'],
});

router.get('/:dataset', asyncHandler(async (req, res) => {
  const collections = PUBLIC_DATASETS[req.params.dataset];
  if (!collections) {
    throw httpError(404, 'PUBLIC_DATASET_NOT_FOUND', 'Public dataset not found.');
  }

  const filename = path.join(DATA_DIR, `${req.params.dataset}.json`);
  let dataset;
  try {
    dataset = JSON.parse(await fs.readFile(filename, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw httpError(404, 'PUBLIC_DATASET_NOT_FOUND', 'Public dataset not found.');
    }
    throw error;
  }

  const data = {};
  for (const collection of collections) {
    if (!Array.isArray(dataset[collection])) {
      throw httpError(503, 'PUBLIC_DATASET_UNAVAILABLE', 'Public dataset is temporarily unavailable.');
    }
    data[collection] = dataset[collection];
  }

  return sendSuccess(res, data, 200, { updatedAt: dataset.updatedAt || null });
}));

module.exports = router;
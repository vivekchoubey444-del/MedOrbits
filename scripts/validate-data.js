#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.resolve(process.cwd(), 'assets', 'data');
const JSON_FILES = [
  'countries.json',
  'courses.json',
  'colleges.json',
  'universities.json',
  'fees.json',
  'scholarships.json',
  'hostels.json',
  'admissions.json',
  'admission-process.json',
  'entrance-exams.json',
  'documents.json',
  'jobs.json',
  'internships.json',
  'career-options.json',
  'categories.json',
  'sectors.json',
  'locations.json',
  'recruitment.json',
  'services.json',
  'testimonials.json',
  'faqs.json',
  'news.json',
  'notifications.json',
];

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Data directory not found: ${DATA_DIR}`);
    process.exitCode = 1;
    return;
  }

  const errors = [];
  let checked = 0;

  for (const filename of JSON_FILES) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed === null || typeof parsed !== 'object') {
        errors.push(`${filename}: expected a JSON object or array at the top level.`);
      }
      checked += 1;
    } catch (error) {
      errors.push(`${filename}: invalid JSON (${error.message}).`);
    }
  }

  console.log(`Validated ${checked} existing JSON data file(s) in ${DATA_DIR}.`);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
  } else {
    console.log('No JSON syntax or top-level type errors found in checked files.');
  }
}

main();

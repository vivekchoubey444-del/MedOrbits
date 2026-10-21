
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage'
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'composer.lock'
]);

let checked = 0;
let errors = 0;

function validateJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    checked++;
    console.log(`PASS ${path.relative(ROOT, filePath)}`);
  } catch (error) {
    errors++;
    console.error(
      `FAIL ${path.relative(ROOT, filePath)}: ${error.message}`
    );
  }
}

function walk(directory) {
  let entries;

  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    errors++;
    console.error(`Cannot read ${directory}: ${error.message}`);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(fullPath);
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    if (IGNORED_FILES.has(entry.name)) {
      continue;
    }

    validateJson(fullPath);
  }
}

walk(ROOT);

console.log(`\nJSON validation: ${checked} passed, ${errors} failed.`);

if (errors > 0) {
  process.exitCode = 1;
} else {
  console.log(STRICT ? 'Strict validation passed.' : 'Validation passed.');
}

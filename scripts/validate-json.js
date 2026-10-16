'use strict';

const fs = require('node:fs');
const path = require('node:path');

const strict = process.argv.includes('--strict');
const root = path.join(__dirname, '..');
const skip = new Set(['node_modules', '.git', 'coverage', 'dist']);
const errors = [];
let count = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.json')) check(full);
  }
}

function check(file) {
  count += 1;
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, 'utf8');
  if (strict && text.trim() === '') {
    errors.push(`${rel}: empty file`);
    return;
  }
  if (strict && text.charCodeAt(0) === 0xfeff) {
    errors.push(`${rel}: contains BOM`);
    return;
  }
  try {
    JSON.parse(text);
  } catch (err) {
    errors.push(`${rel}: ${err.message}`);
  }
}

walk(root);

if (errors.length > 0) {
  errors.forEach((e) => console.error(e));
  process.exit(1);
}
console.log(`Validated ${count} JSON file(s)`);

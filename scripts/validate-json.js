'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const requestedPaths = args.filter((arg) => !arg.startsWith('--'));
const scanRoots = requestedPaths.length ? requestedPaths : ['.'];
const ignoredDirectories = new Set(['.git', 'node_modules', 'coverage', 'dist', 'build']);
const errors = [];
let count = 0;

function relativePath(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function inspectFile(file) {
  count += 1;
  const relative = relativePath(file);
  const source = fs.readFileSync(file, 'utf8');

  if (strict && source.trim() === '') {
    errors.push(`${relative}: file is empty`);
    return;
  }
  if (source.charCodeAt(0) === 0xfeff) {
    errors.push(`${relative}: contains a UTF-8 BOM`);
    return;
  }

  try {
    JSON.parse(source);
  } catch (error) {
    errors.push(`${relative}: ${error.message}`);
  }
}

function walk(target) {
  const absolute = path.resolve(root, target);
  let stat;

  try {
    stat = fs.statSync(absolute);
  } catch (error) {
    errors.push(`${target}: unable to read path (${error.message})`);
    return;
  }

  if (stat.isFile()) {
    if (absolute.endsWith('.json')) inspectFile(absolute);
    return;
  }
  if (!stat.isDirectory()) return;

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    walk(path.join(absolute, entry.name));
  }
}

for (const scanRoot of scanRoots) walk(scanRoot);

if (errors.length) {
  errors.forEach((error) => console.error(error));
  console.error(`JSON validation failed: ${errors.length} error(s), ${count} file(s) checked.`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${count} JSON file(s)`);
  if (strict) console.log('Strict JSON syntax validation passed.');
}
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
#!/usr/bin/env node
‘use strict’;

const fs = require(‘node:fs’);
const path = require(‘node:path’);

const ROOT = process.cwd();

const IGNORE_DIRS = new Set([
‘.git’,
‘node_modules’,
‘coverage’,
‘.next’,
‘dist’,
‘build’,
‘.cache’,
‘.turbo’
]);

const args = process.argv.slice(2);
const strict = args.includes(’–strict’);
const requestedPaths = args.filter((arg) => !arg.startsWith(’–’));
const scanRoots = requestedPaths.length ? requestedPaths : [’.’];

let checked = 0;
let failures = 0;

function relative(file) {
return path.relative(ROOT, file).split(path.sep).join(’/’);
}

function reportError(file, message) {
failures += 1;

console.error(
\n::error file=${relative(file)}::${message}
);

console.error(INVALID JSON: ${relative(file)});
console.error(message);
}

function parseJsonFile(file) {
let source;

try {
source = fs.readFileSync(file, ‘utf8’);
} catch (error) {
reportError(file, Could not read file: ${error.message});
return;
}

if (source.charCodeAt(0) === 0xfeff) {
source = source.slice(1);
}

if (source.trim().length === 0) {
reportError(file, ‘File is empty. Expected a JSON value.’);
return;
}

try {
JSON.parse(source);
checked += 1;
console.log(Valid JSON: ${relative(file)});
} catch (error) {
const match = /position\s+(\d+)/i.exec(error.message);
let location = ‘’;

if (match) {
  const position = Number(match[1]);
  const before = source.slice(0, position);
  const line = before.split('\n').length;
  const lastNewline = before.lastIndexOf('\n');
  const column = position - lastNewline;
  location = ` (line ${line}, column ${column})`;
}
reportError(
  file,
  `${error.message}${location}`
);

}
}

function walk(target) {
const absolute = path.resolve(ROOT, target);
let stat;

try {
stat = fs.statSync(absolute);
} catch (error) {
failures += 1;

console.error(
  `\n::error::Path not found: ${target} (${error.message})`
);
return;

}

if (stat.isFile()) {
if (absolute.endsWith(’.json’)) {
parseJsonFile(absolute);
}

return;

}

if (!stat.isDirectory()) {
return;
}

let entries;

try {
entries = fs.readdirSync(absolute, {
withFileTypes: true
});
} catch (error) {
failures += 1;

console.error(
  `\n::error::Cannot read directory ${target}: ${error.message}`
);
return;

}

for (const entry of entries) {
if (
entry.isDirectory() &&
IGNORE_DIRS.has(entry.name)
) {
continue;
}

const child = path.join(absolute, entry.name);
if (entry.isDirectory()) {
  walk(child);
} else if (
  entry.isFile() &&
  entry.name.endsWith('.json')
) {
  parseJsonFile(child);
}

}
}

for (const scanRoot of scanRoots) {
walk(scanRoot);
}

console.log(
\nJSON validation summary: ${checked} valid file(s), ${failures} error(s).
);

if (failures > 0) {
process.exitCode = 1;
} else if (strict) {
console.log(‘Strict JSON syntax validation passed.’);
}

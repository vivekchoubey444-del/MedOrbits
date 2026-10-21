
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = fs.realpathSync(path.resolve(__dirname, '..'));
const args = process.argv.slice(2);

const strict = args.includes('--strict');
const jsonOutput = args.includes('--json');

const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  'coverage',
  'dist',
  'build',
  '.next',
  '.cache'
]);

const errors = [];
const warnings = [];
const checkedFiles = [];
const visitedDirectories = new Set();
const visitedFiles = new Set();

let count = 0;

const requestedPaths = args.filter(
  (arg) => !arg.startsWith('--')
);
const scanRoots = requestedPaths.length ? requestedPaths : ['.'];

function relativePath(file) {
  const relative = path.relative(ROOT, file);
  return (relative || '.').split(path.sep).join('/');
}

function addError(file, message) {
  errors.push({
    file: relativePath(file),
    message
  });
}

function addWarning(file, message) {
  warnings.push({
    file: relativePath(file),
    message
  });
}

function isInsideRoot(target) {
  const relative = path.relative(ROOT, target);

  return (
    relative === '' ||
    (
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    )
  );
}

function inspectFile(file) {
  const identity = path.resolve(file);

  if (visitedFiles.has(identity)) {
    return;
  }

  visitedFiles.add(identity);
  count += 1;
  checkedFiles.push(relativePath(file));

  let source;

  try {
    source = fs.readFileSync(file, 'utf8');
  } catch (error) {
    addError(file, `Unable to read file: ${error.message}`);
    return;
  }

  if (source.charCodeAt(0) === 0xfeff) {
    addError(file, 'Contains a UTF-8 BOM; save as UTF-8 without BOM.');
    return;
  }

  if (strict && source.trim() === '') {
    addError(file, 'File is empty.');
    return;
  }

  try {
    JSON.parse(source);
  } catch (error) {
    addError(file, `Invalid JSON: ${error.message}`);
  }
}

function walk(target) {
  const absolute = path.resolve(ROOT, target);

  if (!isInsideRoot(absolute)) {
    addError(absolute, 'Path resolves outside the repository root.');
    return;
  }

  let stat;

  try {
    stat = fs.lstatSync(absolute);
  } catch (error) {
    addError(absolute, `Unable to access path: ${error.message}`);
    return;
  }

  if (stat.isSymbolicLink()) {
    addWarning(absolute, 'Symbolic link skipped.');
    return;
  }

  if (stat.isFile()) {
    if (absolute.toLowerCase().endsWith('.json')) {
      inspectFile(absolute);
    }
    return;
  }

  if (!stat.isDirectory()) {
    return;
  }

  let realPath;

  try {
    realPath = fs.realpathSync(absolute);
  } catch (error) {
    addError(absolute, `Unable to resolve directory: ${error.message}`);
    return;
  }

  if (!isInsideRoot(realPath)) {
    addError(absolute, 'Resolved directory is outside the repository root.');
    return;
  }

  if (visitedDirectories.has(realPath)) {
    return;
  }

  visitedDirectories.add(realPath);

  let entries;

  try {
    entries = fs.readdirSync(absolute, { withFileTypes: true });
  } catch (error) {
    addError(absolute, `Unable to read directory: ${error.message}`);
    return;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const child = path.join(absolute, entry.name);

    if (entry.isSymbolicLink()) {
      addWarning(child, 'Symbolic link skipped.');
      continue;
    }

    walk(child);
  }
}

for (const scanRoot of scanRoots) {
  walk(scanRoot);
}

checkedFiles.sort((a, b) => a.localeCompare(b));

const result = {
  ok: errors.length === 0 && (!strict || warnings.length === 0),
  mode: strict ? 'strict' : 'standard',
  root: relativePath(ROOT),
  filesChecked: count,
  errorCount: errors.length,
  warningCount: warnings.length,
  checkedFiles,
  errors,
  warnings
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('MedOrbits JSON validation');
  console.log(`Mode: ${result.mode}`);
  console.log(`Files checked: ${count}`);

  for (const warning of warnings) {
    console.warn(`WARNING: ${warning.file}: ${warning.message}`);
  }

  for (const error of errors) {
    console.error(`ERROR: ${error.file}: ${error.message}`);
  }

  if (result.ok) {
    console.log(
      strict
        ? 'PASS: Strict JSON validation passed with no warnings.'
        : 'PASS: All checked files contain valid JSON.'
    );
  } else {
    console.error(
      `FAIL: ${errors.length} error(s), ${warnings.length} warning(s).`
    );
  }
}

process.exitCode = result.ok ? 0 : 1;

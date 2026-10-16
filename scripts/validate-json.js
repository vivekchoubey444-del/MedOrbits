'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const ROOT_DIR = path.resolve(__dirname, '..');
const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'coverage',
  '.next',
  'dist',
  'build',
  '.cache',
  'vendor',
]);
const EXCLUDED_FILES = new Set(['.DS_Store']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const STRICT_MODE = process.argv.includes('--strict');
const decoder = new TextDecoder('utf-8', {
  fatal: true,
  ignoreBOM: true,
});
const stats = {
  scanned: 0,
  valid: 0,
  invalid: 0,
  skipped: 0,
};
const errors = [];
function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}
function reportError(filePath, message) {
  errors.push({
    file: relativePath(filePath),
    message,
  });
}
function parseJson(filePath) {
  let buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch (error) {
    reportError(filePath, `Unable to read file: ${error.message}`);
    stats.invalid++;
    return;
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    reportError(
      filePath,
      `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB size limit.`,
    );
    stats.invalid++;
    return;
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    reportError(
      filePath,
      'UTF-8 BOM detected. Save the file as UTF-8 without BOM.',
    );
    stats.invalid++;
    return;
  }
  let content;
  try {
    content = decoder.decode(buffer);
  } catch {
    reportError(filePath, 'File is not valid UTF-8.');
    stats.invalid++;
    return;
  }
  try {
    JSON.parse(content);
    stats.valid++;
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? error.message
        : 'Unknown JSON parsing error';
    reportError(filePath, `Invalid JSON: ${message}`);
    stats.invalid++;
  }
}
function walkDirectory(directory) {
  let entries;
  try {
    entries = fs.readdirSync(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    reportError(directory, `Unable to read directory: ${error.message}`);
    stats.invalid++;
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      stats.skipped++;
      continue;
    }
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        stats.skipped++;
        continue;
      }
      walkDirectory(fullPath);
      continue;
    }
    if (!entry.isFile() || EXCLUDED_FILES.has(entry.name)) {
      stats.skipped++;
      continue;
    }
    if (path.extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }
    stats.scanned++;
    parseJson(fullPath);
  }
}
function printSummary() {
  console.log('\nMedOrbits JSON Validation');
  console.log('='.repeat(32));
  console.log(`Mode:               ${STRICT_MODE ? 'Strict' : 'Standard'}`);
  console.log(`JSON files scanned: ${stats.scanned}`);
  console.log(`Valid files:        ${stats.valid}`);
  console.log(`Invalid files:      ${stats.invalid}`);
  console.log(`Skipped entries:    ${stats.skipped}`);
  if (errors.length > 0) {
    console.error('\nValidation errors:');
    for (const error of errors) {
      console.error(`\n❌ ${error.file}`);
      console.error(`   ${error.message}`);
    }
    console.error(`\nValidation failed with ${errors.length} error(s).`);
  } else {
    console.log('\nAll discovered JSON files are valid.');
  }
}
function main() {
  if (!fs.existsSync(ROOT_DIR) || !fs.statSync(ROOT_DIR).isDirectory()) {
    console.error(`Repository directory not found: ${ROOT_DIR}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Scanning repository: ${ROOT_DIR}`);
  walkDirectory(ROOT_DIR);
  printSummary();
  if (stats.invalid > 0) {
    process.exitCode = 1;
  }
}
main();
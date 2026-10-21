
#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_DOCUMENTS_DIR = path.join(ROOT_DIR, 'assets', 'documents');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const jsonOutput = args.includes('--json');

function readOption(name) {
  const prefix = `--${name}=`;
  const matches = args.filter((item) => item.startsWith(prefix));

  if (matches.length > 1) {
    throw new Error(`Option --${name} may only be provided once.`);
  }

  return matches.length ? matches[0].slice(prefix.length) : null;
}

let customDir;

try {
  customDir = readOption('dir');
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

if (args.some((arg) =>
  !['--strict', '--json'].includes(arg) &&
  !arg.startsWith('--dir=')
)) {
  console.error('Usage: node scripts/validate-document-manifests.mjs [--strict] [--json] [--dir=assets/documents]');
  process.exit(2);
}

if (customDir !== null && !customDir.trim()) {
  console.error('Option --dir must not be empty.');
  process.exit(2);
}

const DOCUMENTS_DIR = path.resolve(
  ROOT_DIR,
  customDir || path.relative(ROOT_DIR, DEFAULT_DOCUMENTS_DIR)
);

const errors = [];
const warnings = [];
const checkedFiles = [];
const seenIds = new Map();
const seenPaths = new Map();

function relative(file) {
  const result = path.relative(ROOT_DIR, file).split(path.sep).join('/');
  return result || '.';
}

function error(file, message) {
  errors.push({ file: relative(file), message });
}

function warn(file, message) {
  warnings.push({ file: relative(file), message });
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);

  return (
    rel !== '' &&
    rel !== '..' &&
    !rel.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(rel)
  );
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function readJson(file) {
  let content;

  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (err) {
    error(file, `Unable to read JSON: ${err.message}`);
    return null;
  }

  if (content.charCodeAt(0) === 0xfeff) {
    error(file, 'UTF-8 BOM detected; save as UTF-8 without BOM.');
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (err) {
    error(file, `Unable to parse JSON: ${err.message}`);
    return null;
  }
}

function walkJsonFiles(directory) {
  const results = [];

  function walk(current) {
    let entries;

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      error(current, `Unable to read directory: ${err.message}`);
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(current, entry.name);

      if (entry.isSymbolicLink()) {
        warn(fullPath, 'Symbolic link skipped.');
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.toLowerCase() === 'manifest.json'
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(directory);
  return results;
}

function validateResource(manifestFile, resource, index, categoryIds) {
  const label = `resources[${index}]`;

  if (
    !resource ||
    typeof resource !== 'object' ||
    Array.isArray(resource)
  ) {
    error(manifestFile, `${label} must be an object.`);
    return;
  }

  for (const field of ['id', 'title', 'category', 'path', 'status']) {
    if (
      typeof resource[field] !== 'string' ||
      resource[field].trim() === ''
    ) {
      error(manifestFile, `${label}.${field} must be a non-empty string.`);
    }
  }

  if (
    typeof resource.category === 'string' &&
    categoryIds.size > 0 &&
    !categoryIds.has(resource.category)
  ) {
    error(
      manifestFile,
      `${label}.category "${resource.category}" is not declared in this manifest's categories.`
    );
  }

  if (typeof resource.id === 'string' && resource.id.trim()) {
    const id = resource.id.trim();

    if (seenIds.has(id)) {
      error(
        manifestFile,
        `${label} duplicates resource ID "${id}" already used in ${seenIds.get(id)}.`
      );
    } else {
      seenIds.set(id, relative(manifestFile));
    }
  }

  if (typeof resource.path !== 'string' || !resource.path.trim()) {
    // Required-field validation above reports this.
    return;
  }

  const resourcePath = resource.path.trim();

  if (
    path.isAbsolute(resourcePath) ||
    resourcePath.includes('\\') ||
    resourcePath.includes('\0') ||
    /^[a-z][a-z0-9+.-]*:/i.test(resourcePath) ||
    resourcePath.split('/').some((part) => part === '..' || part === '.')
  ) {
    error(manifestFile, `${label}.path must be a safe relative POSIX path.`);
    return;
  }

  // Resource paths are relative to the manifest directory.
  const resolved = path.resolve(path.dirname(manifestFile), resourcePath);

  if (!isInside(DOCUMENTS_DIR, resolved)) {
    error(
      manifestFile,
      `${label}.path resolves outside the documents directory: ${resourcePath}`
    );
    return;
  }

  const pathKey = path.relative(DOCUMENTS_DIR, resolved)
    .split(path.sep)
    .join('/');

  if (seenPaths.has(pathKey)) {
    error(
      manifestFile,
      `${label}.path duplicates "${pathKey}" already referenced in ${seenPaths.get(pathKey)}.`
    );
  } else {
    seenPaths.set(pathKey, relative(manifestFile));
  }

  if (
    resource.format === 'application/pdf' &&
    !resourcePath.toLowerCase().endsWith('.pdf')
  ) {
    error(manifestFile, `${label} is a PDF but its path does not end in .pdf.`);
  }

  let stats = null;

  try {
    stats = fs.lstatSync(resolved);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      error(manifestFile, `${label} cannot be inspected: ${err.message}`);
      return;
    }
  }

  if (stats?.isSymbolicLink()) {
    error(manifestFile, `${label}.path must not point to a symbolic link.`);
    return;
  }

  if (resource.status === 'published') {
    if (!stats) {
      error(
        manifestFile,
        `${label} is published but the file does not exist: ${resourcePath}`
      );
    } else if (!stats.isFile()) {
      error(manifestFile, `${label} path is not a regular file: ${resourcePath}`);
    }
  } else if (!stats) {
    warn(
      manifestFile,
      `${label} file is missing; permitted for non-published resources: ${resourcePath}`
    );
  }

  if (resource.status === 'published') {
    if (
      !['official_sources_checked', 'officially_verified'].includes(
        resource.verificationStatus
      )
    ) {
      error(
        manifestFile,
        `${label} is published but verificationStatus is not approved.`
      );
    }

    if (
      !Array.isArray(resource.officialSources) ||
      resource.officialSources.length === 0
    ) {
      error(
        manifestFile,
        `${label} is published but officialSources is empty or missing.`
      );
    } else {
      resource.officialSources.forEach((source, sourceIndex) => {
        if (typeof source !== 'string' || !source.trim()) {
          error(
            manifestFile,
            `${label}.officialSources[${sourceIndex}] must be a non-empty string.`
          );
        } else {
          try {
            const url = new URL(source);

            if (url.protocol !== 'https:') {
              error(
                manifestFile,
                `${label}.officialSources[${sourceIndex}] must use HTTPS.`
              );
            }
          } catch {
            error(
              manifestFile,
              `${label}.officialSources[${sourceIndex}] must be a valid URL.`
            );
          }
        }
      });
    }

    for (const field of ['lastReviewedAt', 'reviewDueAt']) {
      if (!isValidDate(resource[field])) {
        error(
          manifestFile,
          `${label} is published but ${field} is not a valid YYYY-MM-DD date.`
        );
      }
    }

    if (
      isValidDate(resource.lastReviewedAt) &&
      isValidDate(resource.reviewDueAt) &&
      resource.reviewDueAt < resource.lastReviewedAt
    ) {
      error(
        manifestFile,
        `${label}.reviewDueAt must not be earlier than lastReviewedAt.`
      );
    }
  }
}

function validateManifest(file) {
  checkedFiles.push(relative(file));

  const manifest = readJson(file);
  if (manifest === null) return;

  if (
    typeof manifest !== 'object' ||
    Array.isArray(manifest)
  ) {
    error(file, 'Manifest root must be an object.');
    return;
  }

  if (!Array.isArray(manifest.resources)) {
    warn(file, 'No resources array found; this may be a category-only manifest.');
    return;
  }

  const categoryIds = new Set();

  if (manifest.categories !== undefined) {
    if (!Array.isArray(manifest.categories)) {
      error(file, 'categories must be an array when provided.');
    } else {
      manifest.categories.forEach((category, index) => {
        const id = typeof category === 'string' ? category : category?.id;

        if (typeof id !== 'string' || !id.trim()) {
          error(file, `categories[${index}] must have a non-empty string ID.`);
          return;
        }

        if (categoryIds.has(id)) {
          error(file, `Duplicate category ID "${id}".`);
        }

        categoryIds.add(id);
      });
    }
  }

  const localIds = new Set();

  manifest.resources.forEach((resource, index) => {
    if (
      resource &&
      typeof resource === 'object' &&
      !Array.isArray(resource) &&
      typeof resource.id === 'string'
    ) {
      const id = resource.id.trim();

      if (localIds.has(id)) {
        error(file, `Duplicate resource ID "${id}" within this manifest.`);
      }

      localIds.add(id);
    }

    validateResource(file, resource, index, categoryIds);
  });
}

let rootStats;

try {
  rootStats = fs.lstatSync(DOCUMENTS_DIR);
} catch (err) {
  error(DOCUMENTS_DIR, `Documents directory is unavailable: ${err.message}`);
}

if (rootStats) {
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    error(DOCUMENTS_DIR, 'Documents path must be a real directory, not a symbolic link.');
  } else {
    const manifests = walkJsonFiles(DOCUMENTS_DIR);

    if (manifests.length === 0) {
      warn(DOCUMENTS_DIR, 'No MANIFEST.json files were found.');
    }

    for (const file of manifests) {
      validateManifest(file);
    }
  }
}

const result = {
  ok: errors.length === 0 && (!strict || warnings.length === 0),
  root: relative(DOCUMENTS_DIR),
  checkedManifestCount: checkedFiles.length,
  checkedManifests: checkedFiles,
  errorCount: errors.length,
  warningCount: warnings.length,
  errors,
  warnings,
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('MedOrbits document manifest validation');
  console.log(`Documents directory: ${result.root}`);
  console.log(`Manifests checked: ${result.checkedManifestCount}`);

  for (const item of warnings) {
    console.warn(`WARNING: ${item.file}: ${item.message}`);
  }

  for (const item of errors) {
    console.error(`ERROR: ${item.file}: ${item.message}`);
  }

  if (result.ok) {
    console.log(
      strict
        ? 'PASS: Validation succeeded with no warnings.'
        : 'PASS: No blocking validation errors found.'
    );
  } else {
    console.error('FAIL: Document manifest validation failed.');
  }
}

process.exitCode = result.ok ? 0 : 1;

'use strict';
/**
 * MedOrbits Security Preflight
 *
 * Checks:
 * 1. JSON syntax
 * 2. Required security files
 * 3. Potential hard-coded secrets
 * 4. Accidentally tracked environment files
 *
 * Note: This is a lightweight heuristic, not a replacement
 * for Gitleaks or GitHub secret scanning.
 */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.venv'
]);
const TEXT_EXTENSIONS = new Set([
  '.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx',
  '.json', '.yml', '.yaml', '.env', '.md',
  '.html', '.css', '.sh', '.sql', '.toml',
  '.xml', '.txt'
]);
const REQUIRED_FILES = [
  'package.json',
  '.github/workflows/ci.yml',
  '.github/workflows/secret-scan.yml',
  '.github/workflows/codeql.yml',
  '.github/dependabot.yml'
];
const SECRET_PATTERNS = [
  {
    name: 'Private key',
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/
  },
  {
    name: 'Possible AWS access key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/
  },
  {
    name: 'Possible GitHub token',
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/
  },
  {
    name: 'Possible hard-coded credential',
    pattern:
      /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\b\s*[:=]\s*['"][^'"\r\n]{8,}['"]/i
  }
];
const failures = [];
const warnings = [];
function relative(filePath) {
  return path.relative(ROOT, filePath) || '.';
}
function checkJson(filePath) {
  try {
    JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`PASS JSON: ${relative(filePath)}`);
  } catch (error) {
    failures.push(
      `Invalid JSON in ${relative(filePath)}: ${error.message}`
    );
  }
}
function inspectText(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    warnings.push(
      `Could not read ${relative(filePath)}: ${error.message}`
    );
    return;
  }
  for (const item of SECRET_PATTERNS) {
    if (item.pattern.test(content)) {
      warnings.push(
        `Possible ${item.name} in ${relative(filePath)}. Review manually.`
      );
    }
  }
}
function inspectFile(filePath) {
  const name = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();
  if (
    name === '.env' ||
    /^\.env\.(?!example$|sample$|template$)/i.test(name)
  ) {
    warnings.push(
      `Environment file found: ${relative(filePath)}. ` +
      'Ensure it is not tracked and contains no real credentials.'
    );
  }
  if (extension === '.json') {
    checkJson(filePath);
  }
  if (TEXT_EXTENSIONS.has(extension) || name.startsWith('.env')) {
    inspectText(filePath);
  }
}
function walk(directory) {
  let entries;
  try {
    entries = fs.readdirSync(directory, {
      withFileTypes: true
    });
  } catch (error) {
    failures.push(
      `Cannot read ${relative(directory)}: ${error.message}`
    );
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      inspectFile(fullPath);
    }
  }
}
function main() {
  console.log('MedOrbits Security Preflight');
  console.log('============================\n');
  for (const requiredFile of REQUIRED_FILES) {
    const fullPath = path.join(ROOT, requiredFile);
    if (!fs.existsSync(fullPath)) {
      failures.push(`Required file missing: ${requiredFile}`);
    } else {
      console.log(`PASS Required file: ${requiredFile}`);
    }
  }
  walk(ROOT);
  if (warnings.length > 0) {
    console.log('\nSecurity warnings:');
    for (const warning of [...new Set(warnings)]) {
      console.warn(`WARN: ${warning}`);
    }
  }
  if (failures.length > 0) {
    console.error('\nSecurity preflight FAILED:');
    for (const failure of failures) {
      console.error(`ERROR: ${failure}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log('\nSecurity preflight PASSED.');
  console.log(
    'Review any warnings and use Gitleaks for dedicated secret scanning.'
  );
}
main();
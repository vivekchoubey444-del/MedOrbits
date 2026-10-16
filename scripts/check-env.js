#!/usr/bin/env node
‘use strict’;

/**

* MedOrbits -- Environment Configuration Checker
* Purpose:
* Validate required runtime environment variables before application startup
* or deployment.
* Usage:
* node scripts/check-env.js
* Optional package.json script:
* "check:env": "node scripts/check-env.js"
* Security:
* ●	Never prints secret values.
* ●	Does not modify environment variables.
* ●	Does not connect to the database.
        */

require(‘dotenv’).config();

const REQUIRED_VARIABLES = [
‘NODE_ENV’,
‘SESSION_SECRET’,
];

const DATABASE_URL_VARIABLE = ‘DATABASE_URL’;

const MYSQL_VARIABLES = [
‘MYSQL_HOST’,
‘MYSQL_DATABASE’,
‘MYSQL_USER’,
];

const SESSION_SECRET_MIN_LENGTH = 32;

const PLACEHOLDER_PATTERNS = [
/^change[-_ ]?me$/i,
/^replace[-_ ]?me$/i,
/^your[-_ ].+$/i,
/^example$/i,
/^placeholder$/i,
/^secret$/i,
/^password$/i,
/^test$/i,
];

function isPresent(name) {
const value = process.env[name];

return typeof value === ‘string’ && value.trim().length > 0;
}

function report(issues, severity, message) {
issues.push({ severity, message });
}

function validateRequiredVariables(issues) {
for (const name of REQUIRED_VARIABLES) {
if (!isPresent(name)) {
report(
issues,
‘ERROR’,
Required environment variable ${name} is missing or empty.
);
}
}
}

function validateEnvironment(issues) {
if (!isPresent(‘NODE_ENV’)) {
return;
}

const environment = process.env.NODE_ENV.trim();
const allowedEnvironments = [
‘development’,
‘test’,
‘staging’,
‘production’,
];

if (!allowedEnvironments.includes(environment)) {
report(
issues,
‘ERROR’,
NODE_ENV="${environment}" is not a recognized environment.
);
}
}

function validateSessionSecret(issues) {
if (!isPresent(‘SESSION_SECRET’)) {
return;
}

const secret = process.env.SESSION_SECRET.trim();

const looksLikePlaceholder = PLACEHOLDER_PATTERNS.some((pattern) =>
pattern.test(secret)
);

if (
secret.length < SESSION_SECRET_MIN_LENGTH ||
looksLikePlaceholder ||
new Set(secret).size < 8
) {
report(
issues,
‘ERROR’,
‘SESSION_SECRET appears weak or may be a placeholder. Use a strong, randomly generated secret.’
);
}
}

function validateDatabaseConfiguration(issues) {
const hasDatabaseUrl = isPresent(DATABASE_URL_VARIABLE);
const presentMysqlVariables = MYSQL_VARIABLES.filter(isPresent);

const hasAnyMysqlVariable = presentMysqlVariables.length > 0;
const hasAllMysqlVariables =
presentMysqlVariables.length === MYSQL_VARIABLES.length;

if (hasDatabaseUrl && hasAnyMysqlVariable) {
report(
issues,
‘ERROR’,
‘Both DATABASE_URL and individual MySQL settings are configured. Confirm which configuration the database adapter actually uses.’
);

return;

}

if (hasAnyMysqlVariable && !hasAllMysqlVariables) {
const missing = MYSQL_VARIABLES.filter((name) => !isPresent(name));

report(
  issues,
  'ERROR',
  `Incomplete MySQL configuration. Missing: ${missing.join(', ')}.`
);
return;

}

if (!hasDatabaseUrl && !hasAllMysqlVariables) {
report(
issues,
‘ERROR’,
‘Database configuration is missing. Configure DATABASE_URL or all required individual MySQL settings.’
);
}
}

function validateProductionSettings(issues) {
if (process.env.NODE_ENV?.trim() !== ‘production’) {
return;
}

if (process.env.DEBUG?.trim().toLowerCase() === ‘true’) {
report(
issues,
‘ERROR’,
‘DEBUG=true is configured in production. Disable debug mode.’
);
}

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === ‘0’) {
report(
issues,
‘ERROR’,
‘TLS certificate verification is disabled. Remove NODE_TLS_REJECT_UNAUTHORIZED=0.’
);
}

if (process.env.ALLOW_MIGRATIONS === ‘true’) {
report(
issues,
‘WARNING’,
‘ALLOW_MIGRATIONS=true is set in production. Confirm that migration execution is separately approved and controlled.’
);
}
}

function printReport(issues) {
const errors = issues.filter((item) => item.severity === ‘ERROR’);
const warnings = issues.filter((item) => item.severity === ‘WARNING’);

console.log(’\nMedOrbits Environment Configuration Check’);
console.log(’--------------------------–’);

if (issues.length === 0) {
console.log(‘PASS: All configured checks passed.’);
} else {
for (const issue of issues) {
const output =
issue.severity === ‘ERROR’ ? console.error : console.warn;

  output(`[${issue.severity}] ${issue.message}`);
}

}

console.log(’\nSummary’);
console.log(Errors: ${errors.length});
console.log(Warnings: ${warnings.length});
console.log(‘Secret values are never displayed.’);

if (errors.length > 0) {
console.error(’\nFAIL: Fix the configuration errors before proceeding.’);
process.exitCode = 1;
} else if (warnings.length > 0) {
console.log(’\nPASS WITH WARNINGS: Review the warnings above.’);
} else {
console.log(’\nPASS: Environment configuration checks completed.’);
}
}

function main() {
const issues = [];

validateRequiredVariables(issues);
validateEnvironment(issues);
validateSessionSecret(issues);
validateDatabaseConfiguration(issues);
validateProductionSettings(issues);

printReport(issues);
}

main();
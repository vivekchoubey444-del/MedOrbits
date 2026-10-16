#!/usr/bin/env node
‘use strict’;

/**

* MedOrbits -- Security Configuration Checker
* Checks selected runtime security settings without displaying secret values.
* Usage:
* node scripts/security-check.js
* Optional package.json script:
* "check:security": "node scripts/security-check.js"
* Scope:
* This checks selected environment variables only. It does not replace
* dependency auditing, static analysis, penetration testing, or a security audit.
    */

const REQUIRED_SECRETS = [
‘SESSION_SECRET’,
];

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

const MIN_SESSION_SECRET_LENGTH = 32;
const MIN_DISTINCT_SECRET_CHARACTERS = 8;

const PRODUCTION_FORBIDDEN_SETTINGS = [
{
name: ‘DEBUG’,
value: ‘true’,
message: ‘DEBUG=true is configured in production.’,
},
{
name: ‘NODE_TLS_REJECT_UNAUTHORIZED’,
value: ‘0’,
message:
‘TLS certificate verification is disabled. Remove NODE_TLS_REJECT_UNAUTHORIZED=0.’,
},
];

const SUSPICIOUS_GENERIC_NAMES =
/^(PASSWORD|PASSWD|SECRET|PRIVATE_KEY|API_KEY)$/i;

function isPresent(value) {
return typeof value === ‘string’ && value.trim().length > 0;
}

function isPlaceholder(value) {
const normalized = value.trim();

return PLACEHOLDER_PATTERNS.some((pattern) =>
pattern.test(normalized)
);
}

function isWeakSecret(value) {
if (!isPresent(value)) {
return true;
}

const normalized = value.trim();

return (
normalized.length < MIN_SESSION_SECRET_LENGTH ||
isPlaceholder(normalized) ||
new Set(normalized).size < MIN_DISTINCT_SECRET_CHARACTERS
);
}

function reportIssue(issues, severity, message) {
issues.push({ severity, message });
}

function checkRequiredSecrets(issues) {
for (const name of REQUIRED_SECRETS) {
const value = process.env[name];

if (!isPresent(value)) {
  reportIssue(
    issues,
    'ERROR',
    `Required security variable ${name} is missing or empty.`
  );
  continue;
}
if (isWeakSecret(value)) {
  reportIssue(
    issues,
    'ERROR',
    `${name} appears weak or may contain a placeholder. Use a strong, randomly generated secret.`
  );
}

}
}

function checkEnvironment(issues) {
const nodeEnv = process.env.NODE_ENV?.trim();

if (!nodeEnv) {
reportIssue(
issues,
‘WARNING’,
‘NODE_ENV is not set; the runtime environment cannot be verified.’
);
return;
}

if (nodeEnv !== ‘production’) {
return;
}

for (const setting of PRODUCTION_FORBIDDEN_SETTINGS) {
if (process.env[setting.name] === setting.value) {
reportIssue(issues, ‘ERROR’, setting.message);
}
}

if (process.env.ALLOW_MIGRATIONS === ‘true’) {
reportIssue(
issues,
‘WARNING’,
‘ALLOW_MIGRATIONS=true is configured in production. Confirm that migration execution is separately controlled and approved.’
);
}

if (process.env.DEBUG?.toLowerCase() === ‘true’) {
// The DEBUG=true case is already reported above. Avoid duplicate reports.
}

const sessionSecret = process.env.SESSION_SECRET;

if (isPresent(sessionSecret) && isWeakSecret(sessionSecret)) {
// The required-secret check already reports this issue.
}
}

function checkSensitiveEnvironmentNames(issues) {
const suspiciousNames = Object.keys(process.env)
.filter((name) => SUSPICIOUS_GENERIC_NAMES.test(name))
.sort();

if (suspiciousNames.length > 0) {
reportIssue(
issues,
‘WARNING’,
Review generic secret variable names: ${suspiciousNames.join(', ')}. Confirm that the application uses the intended configuration variables.
);
}
}

function printReport(issues) {
const errors = issues.filter((issue) => issue.severity === ‘ERROR’);
const warnings = issues.filter(
(issue) => issue.severity === ‘WARNING’
);

console.log(’\nMedOrbits Security Configuration Check’);
console.log(’–––––––––––––––––––’);

if (issues.length === 0) {
console.log(‘PASS: No issues detected by the configured checks.’);
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
console.error(’\nFAIL: Resolve the security errors before proceeding.’);
process.exitCode = 1;
} else if (warnings.length > 0) {
console.log(’\nPASS WITH WARNINGS: Review the warnings above.’);
} else {
console.log(’\nPASS: All configured checks passed.’);
}
}

function main() {
const issues = [];

checkRequiredSecrets(issues);
checkEnvironment(issues);
checkSensitiveEnvironmentNames(issues);

printReport(issues);
}

main();
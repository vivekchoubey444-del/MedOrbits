#!/usr/bin/env node
‘use strict’;

/**

* MedOrbits -- Database Seed Runner
* Purpose:
* Safely prepare and execute approved development or staging seed data.
* Safety:
* ●	Seeding is disabled unless ALLOW_SEEDING=true.
* ●	Production seeding is blocked unconditionally.
* ●	Unknown environments are rejected.
* ●	No seed data is written until the approved seed runner is configured.
* IMPORTANT:
* This is a safety scaffold, not an operational seed implementation.
* Integrate the approved seed files and database adapter before use.
    */

const ALLOWED_ENVIRONMENTS = new Set([
‘development’,
‘test’,
‘staging’,
]);

const ENABLE_FLAG = ‘ALLOW_SEEDING’;

class SeedRunnerError extends Error {
constructor(message) {
super(message);
this.name = ‘SeedRunnerError’;
}
}

function validateEnvironment() {
const environment = process.env.NODE_ENV;

if (!environment || !environment.trim()) {
throw new SeedRunnerError(
‘NODE_ENV is missing. Set it explicitly before running the seed command.’
);
}

if (environment === ‘production’) {
throw new SeedRunnerError(
‘Production seeding is blocked. Use an approved, separately reviewed production data procedure.’
);
}

if (!ALLOWED_ENVIRONMENTS.has(environment)) {
throw new SeedRunnerError(
Unsupported NODE_ENV="${environment}". Allowed environments: ${[ ...ALLOWED_ENVIRONMENTS, ].join(', ')}.
);
}

return environment;
}

function validatePermission() {
if (process.env[ENABLE_FLAG] !== ‘true’) {
throw new SeedRunnerError(
Seeding is disabled. Set ${ENABLE_FLAG}=true only when intentionally running approved seed data.
);
}
}

function validateDatabaseConfiguration() {
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());

const mysqlVariables = [
‘MYSQL_HOST’,
‘MYSQL_DATABASE’,
‘MYSQL_USER’,
];

const hasAnyMysqlVariable = mysqlVariables.some((name) =>
Boolean(process.env[name]?.trim())
);

const hasAllMysqlVariables = mysqlVariables.every((name) =>
Boolean(process.env[name]?.trim())
);

if (hasDatabaseUrl && hasAnyMysqlVariable) {
throw new SeedRunnerError(
‘Both DATABASE_URL and individual MySQL settings are configured. Resolve the database configuration conflict before seeding.’
);
}

if (hasAnyMysqlVariable && !hasAllMysqlVariables) {
const missing = mysqlVariables.filter(
(name) => !process.env[name]?.trim()
);

throw new SeedRunnerError(
  `Incomplete MySQL configuration. Missing: ${missing.join(', ')}.`
);

}

if (!hasDatabaseUrl && !hasAllMysqlVariables) {
throw new SeedRunnerError(
‘Database configuration is missing. Configure DATABASE_URL or the complete MySQL settings required by the project adapter.’
);
}
}

async function runApprovedSeeds() {
/*

* TODO -- Implement only after reviewing the MedOrbits database setup:
* 1.	Import the approved database adapter from the project’s actual path.
* 2.	Import an explicit allowlist of seed files.
* 3.	Confirm every seed targets the selected non-production database.
* 4.	Use transactions where supported.
* 5.	Make seed operations idempotent where practical.
* 6.	Avoid inserting real user data, credentials, or production records.
* 7.	Record a concise completion summary without logging sensitive data.
* 8.	Close database connections in a finally block.
* Do not dynamically execute arbitrary files from a directory.
    */

throw new SeedRunnerError(
‘Seed runner is not configured. Connect the approved seed files and project database adapter before use.’
);
}

async function main() {
validatePermission();

const environment = validateEnvironment();

validateDatabaseConfiguration();

console.log(’[MedOrbits Seed] Safety checks passed.’);
console.log([MedOrbits Seed] Environment: ${environment});

await runApprovedSeeds();

console.log(’[MedOrbits Seed] Operation completed.’);
}

main().catch((error) => {
const message =
error instanceof SeedRunnerError
? error.message
: ‘An unexpected error stopped the seed operation.’;

console.error([MedOrbits Seed] STOPPED: ${message});

if (!(error instanceof SeedRunnerError)) {
console.error(
‘[MedOrbits Seed] Review server-side logs securely for diagnostic details.’
);
}

process.exitCode = 1;
});
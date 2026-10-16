#!/usr/bin/env node
‘use strict’;

/**

* MedOrbits -- Database Connection Check
* File: scripts/check-db.js
* Purpose:
* Verify database connectivity using the configured database adapter.
* Usage:
* node scripts/check-db.js
* Expected adapter:
* src/config/database.js
* Required methods:
* database.checkConnection()
* database.close()
* Expected check result:
* { ok: true, database?: string }
* Exit codes:
* 0 = database check and cleanup succeeded
* 1 = configuration, connection, validation, or cleanup failure
* Security:
* ●	Never prints credentials or connection strings.
* ●	Does not modify database records or schema.
* ●	Does not print raw driver errors.
* ●	Closes the database adapter before exiting.
        */

require(‘dotenv’).config();

const DATABASE_MODULE = ‘../src/config/database’;

function writeResult(status, details = {}) {
const output = {
status,
…details,
timestamp: new Date().toISOString(),
};

console.log(JSON.stringify(output, null, 2));
}

function getSafeErrorMessage(error) {
if (
error instanceof Error &&
error.message ===
‘The database adapter must expose checkConnection() and close() methods.’
) {
return error.message;
}

if (
error instanceof Error &&
error.message ===
‘The database health check did not return a healthy result.’
) {
return error.message;
}

return ‘Database connectivity check failed. Verify the database configuration and connection.’;
}

function validateAdapter(database) {
return Boolean(
database &&
typeof database.checkConnection === ‘function’ &&
typeof database.close === ‘function’
);
}

async function main() {
let database;
let primaryError = null;
let checkPassed = false;
let databaseName;

try {
database = require(DATABASE_MODULE);

if (!validateAdapter(database)) {
  throw new Error(
    'The database adapter must expose checkConnection() and close() methods.'
  );
}
const result = await database.checkConnection();
if (
  !result ||
  typeof result !== 'object' ||
  result.ok !== true
) {
  throw new Error(
    'The database health check did not return a healthy result.'
  );
}
if (
  typeof result.database === 'string' &&
  result.database.trim()
) {
  // Database names are metadata, not credentials. Keep output bounded.
  databaseName = result.database.trim().slice(0, 128);
}
checkPassed = true;

} catch (error) {
primaryError = error;
}

// Always attempt cleanup when the adapter was loaded.
if (database && typeof database.close === ‘function’) {
try {
await database.close();
} catch {
if (!primaryError) {
primaryError = new Error(
‘Database connection cleanup failed.’
);
} else {
// Preserve the primary failure without exposing driver details.
console.error(
‘[MedOrbits DB Check] Database cleanup also failed.’
);
}
}
}

if (primaryError) {
writeResult(‘error’, {
check: ‘database’,
message: getSafeErrorMessage(primaryError),
});

process.exitCode = 1;
return;

}

if (!checkPassed) {
writeResult(‘error’, {
check: ‘database’,
message: ‘The database health check did not complete.’,
});

process.exitCode = 1;
return;

}

writeResult(‘ok’, {
check: ‘database’,
…(databaseName ? { database: databaseName } : {}),
});
}

main().catch(() => {
// Last-resort handler: never expose unexpected internal details.
writeResult(‘error’, {
check: ‘database’,
message: ‘An unexpected error stopped the database check.’,
});

process.exitCode = 1;
});
#!/usr/bin/env node
'use strict';

// Migration runner adapter.
// Connect this script to the migration library and schema conventions actually
// used by the project before enabling database changes.

async function main() {
  if (process.env.ALLOW_MIGRATIONS !== 'true') {
    throw new Error(
      'Migration execution is disabled. Review the migration runner, then set ALLOW_MIGRATIONS=true explicitly.'
    );
  }

  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_PRODUCTION_MIGRATION !== 'true') {
    throw new Error(
      'Production migration blocked. Obtain approval and set CONFIRM_PRODUCTION_MIGRATION=true for the approved run.'
    );
  }

  throw new Error(
    'Migration runner is not configured. Integrate the selected migration tool and database connection before use.'
  );
}

main().catch((error) => {
  console.error(`Migration stopped: ${error.message}`);
  process.exitCode = 1;
});

#!/usr/bin/env node
'use strict';

// Seed runner safety scaffold. Implement against the project's approved seed
// files and database adapter before using it.

async function main() {
  if (process.env.ALLOW_SEEDING !== 'true') {
    throw new Error('Seeding is disabled. Set ALLOW_SEEDING=true only for an intentional seed operation.');
  }

  const environment = process.env.NODE_ENV || 'development';
  if (environment === 'production') {
    throw new Error('Seeding against production is blocked by this scaffold.');
  }

  throw new Error(
    'Seed runner is not configured. Connect approved seed files and the project database adapter before use.'
  );
}

main().catch((error) => {
  console.error(`Seed operation stopped: ${error.message}`);
  process.exitCode = 1;
});

#!/usr/bin/env node
'use strict';

const REQUIRED = [
  'NODE_ENV',
  'DATABASE_URL',
  'SESSION_SECRET',
];

const OPTIONAL_GROUPS = [
  {
    label: 'MySQL discrete connection settings',
    names: ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER'],
    any: true,
  },
];

function main() {
  const missing = REQUIRED.filter((name) => {
    const value = process.env[name];
    return typeof value !== 'string' || value.trim() === '';
  });

  const warnings = [];
  for (const group of OPTIONAL_GROUPS) {
    const present = group.names.filter((name) => {
      const value = process.env[name];
      return typeof value === 'string' && value.trim() !== '';
    });
    if (present.length > 0 && present.length < group.names.length) {
      warnings.push(`${group.label}: only some settings are present (${present.join(', ')}).`);
    }
  }

  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
  } else {
    console.log('Required environment variable names are present.');
  }

  for (const warning of warnings) console.warn(`WARNING: ${warning}`);
  console.log('Secret values are not displayed.');

  if (missing.length) process.exitCode = 1;
}

main();

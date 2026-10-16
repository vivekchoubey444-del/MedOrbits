'use strict';

require('dotenv').config();

const required = ['SESSION_SECRET', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length === 0) {
  console.log('Environment OK');
  process.exit(0);
}

const isProd = process.env.NODE_ENV === 'production';
console.warn(`Missing env vars: ${missing.join(', ')}`);
process.exit(isProd ? 1 : 0);

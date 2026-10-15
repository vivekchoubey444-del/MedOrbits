'use strict';

/**
 * MedOrbits PostgreSQL database configuration.
 *
 * Required package:
 *   npm install pg
 *
 * Environment:
 *   DATABASE_URL=postgresql://user:password@host:5432/database
 *   DB_POOL_MAX=10
 *   DB_IDLE_TIMEOUT_MS=30000
 *   DB_CONNECTION_TIMEOUT_MS=5000
 *   DB_SSL=false
 */

const { Pool } = require('pg');

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const DATABASE_URL = process.env.DATABASE_URL;
const DB_POOL_MAX = Number(process.env.DB_POOL_MAX || 10);
const DB_IDLE_TIMEOUT_MS = Number(
  process.env.DB_IDLE_TIMEOUT_MS || 30000
);
const DB_CONNECTION_TIMEOUT_MS = Number(
  process.env.DB_CONNECTION_TIMEOUT_MS || 5000
);

function validatePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

validatePositiveInteger(DB_POOL_MAX, 'DB_POOL_MAX');
validatePositiveInteger(DB_IDLE_TIMEOUT_MS, 'DB_IDLE_TIMEOUT_MS');
validatePositiveInteger(
  DB_CONNECTION_TIMEOUT_MS,
  'DB_CONNECTION_TIMEOUT_MS'
);

if (IS_PRODUCTION && !DATABASE_URL) {
  throw new Error('DATABASE_URL is required in production.');
}

const sslEnabled = String(process.env.DB_SSL || 'false')
  .trim()
  .toLowerCase() === 'true';

const poolConfig = {
  max: DB_POOL_MAX,
  idleTimeoutMillis: DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
  application_name: 'medorbits',
};

if (DATABASE_URL) {
  poolConfig.connectionString = DATABASE_URL;
}

if (sslEnabled) {
  /*
   * For managed databases, configure certificate verification correctly.
   * Do not disable certificate verification in production.
   */
  poolConfig.ssl = {
    rejectUnauthorized: true,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (error) => {
  console.error('[MedOrbits][Database] Unexpected idle client error:', {
    message: error.message,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Test database connectivity.
 */
async function checkConnection() {
  const result = await pool.query(
    'SELECT CURRENT_TIMESTAMP AS database_time'
  );

  return {
    connected: true,
    databaseTime: result.rows[0].database_time,
  };
}

/**
 * Execute a parameterized query.
 *
 * Example:
 *   const result = await query(
 *     'SELECT id, email FROM users WHERE id = $1',
 *     [userId]
 *   );
 */
async function query(text, values = []) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TypeError('SQL query must be a non-empty string.');
  }

  return pool.query(text, values);
}

/**
 * Obtain a pooled client for transactions.
 *
 * Always release the client in a finally block.
 */
async function connect() {
  return pool.connect();
}

/**
 * Close the connection pool during application shutdown.
 */
async function end() {
  return pool.end();
}

module.exports = {
  pool,
  query,
  connect,
  checkConnection,
  end,
};
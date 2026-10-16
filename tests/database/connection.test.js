'use strict';
/**
 * MedOrbits -- Database Connection Tests
 *
 * File: tests/database/connection.test.js
 *
 * Framework: Node.js built-in node:test
 *
 * Supported drivers:
 * - PostgreSQL: pg
 * - MySQL: mysql2
 *
 * Run:
 *   node --test tests/database/connection.test.js
 *
 * Environment:
 *   TEST_DATABASE_CLIENT=postgres|mysql
 *
 * PostgreSQL:
 *   TEST_DATABASE_URL=postgresql://...
 *
 * MySQL:
 *   TEST_DATABASE_HOST=127.0.0.1
 *   TEST_DATABASE_PORT=3306
 *   TEST_DATABASE_NAME=medorbits_test
 *   TEST_DATABASE_USER=...
 *   TEST_DATABASE_PASSWORD=...
 *
 * Safety:
 * - Requires explicit TEST_DATABASE_* configuration.
 * - Refuses to run when NODE_ENV=production.
 * - Performs read-only queries.
 * - Never creates, modifies, or deletes database records.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const CLIENT = (
  process.env.TEST_DATABASE_CLIENT || ''
).trim().toLowerCase();
const IS_PRODUCTION =
  process.env.NODE_ENV === 'production';
const HAS_POSTGRES_URL =
  Boolean(process.env.TEST_DATABASE_URL) &&
  /^postgres(?:ql)?:\/\//i.test(
    process.env.TEST_DATABASE_URL || '',
  );
const HAS_MYSQL_CONFIG =
  Boolean(
    process.env.TEST_DATABASE_HOST &&
    process.env.TEST_DATABASE_NAME &&
    process.env.TEST_DATABASE_USER,
  );
const CONFIGURED_CLIENT =
  CLIENT === 'postgres'
    ? HAS_POSTGRES_URL
      ? 'postgres'
      : null
    : CLIENT === 'mysql'
      ? HAS_MYSQL_CONFIG
        ? 'mysql'
        : null
      : null;
const CONFIG_ERROR = IS_PRODUCTION
  ? 'Database tests are disabled when NODE_ENV=production.'
  : !['postgres', 'mysql'].includes(CLIENT)
    ? 'Set TEST_DATABASE_CLIENT to postgres or mysql.'
    : !CONFIGURED_CLIENT
      ? CLIENT === 'postgres'
        ? 'Set TEST_DATABASE_URL to a PostgreSQL test database URL.'
        : 'Set TEST_DATABASE_HOST, TEST_DATABASE_NAME, and TEST_DATABASE_USER.'
      : null;
let pool = null;
let driver = null;
let setupError = null;
let driverAvailable = false;
function loadDriver() {
  if (CONFIG_ERROR) {
    return;
  }
  try {
    if (CONFIGURED_CLIENT === 'postgres') {
      driver = require('pg');
      driverAvailable = true;
      return;
    }
    if (CONFIGURED_CLIENT === 'mysql') {
      driver = require('mysql2/promise');
      driverAvailable = true;
    }
  } catch (error) {
    setupError = error;
  }
}
function createPool() {
  if (CONFIGURED_CLIENT === 'postgres') {
    const connectionString = process.env.TEST_DATABASE_URL;
    return new driver.Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      application_name: 'medorbits-database-tests',
      ...(process.env.TEST_DATABASE_SSL === 'true'
        ? {
            ssl: {
              rejectUnauthorized: true,
            },
          }
        : {}),
    });
  }
  if (CONFIGURED_CLIENT === 'mysql') {
    return driver.createPool({
      host: process.env.TEST_DATABASE_HOST,
      port: Number(process.env.TEST_DATABASE_PORT || 3306),
      database: process.env.TEST_DATABASE_NAME,
      user: process.env.TEST_DATABASE_USER,
      password: process.env.TEST_DATABASE_PASSWORD || '',
      connectionLimit: 5,
      waitForConnections: true,
      queueLimit: 10,
      connectTimeout: 5000,
      enableKeepAlive: true,
      multipleStatements: false,
    });
  }
  throw new Error('Unsupported database client.');
}
function ensureTestDatabase() {
  if (IS_PRODUCTION) {
    throw new Error(
      'Refusing to run database tests in production.',
    );
  }
  if (CONFIG_ERROR) {
    throw new Error(CONFIG_ERROR);
  }
  if (!driverAvailable) {
    throw new Error(
      `Database driver unavailable. Install the configured driver. ${
        setupError ? setupError.message : ''
      }`,
    );
  }
  if (!pool) {
    throw new Error('Database connection pool was not initialized.');
  }
}
async function executeReadOnlyProbe() {
  ensureTestDatabase();
  if (CONFIGURED_CLIENT === 'postgres') {
    return pool.query('SELECT 1 AS result');
  }
  const [rows] = await pool.query('SELECT 1 AS result');
  return { rows };
}
function resultValue(result) {
  assert.ok(result, 'Expected a query result.');
  assert.ok(Array.isArray(result.rows), 'Expected result.rows.');
  assert.equal(result.rows.length, 1);
  return Number(result.rows[0].result);
}
loadDriver();
const SHOULD_SKIP = Boolean(CONFIG_ERROR || !driverAvailable);
test.before(async () => {
  if (SHOULD_SKIP) {
    return;
  }
  try {
    pool = createPool();
  } catch (error) {
    setupError = error;
  }
});
test.after(async () => {
  if (!pool) {
    return;
  }
  if (CONFIGURED_CLIENT === 'postgres') {
    await pool.end();
  } else if (CONFIGURED_CLIENT === 'mysql') {
    await pool.end();
  }
  pool = null;
});
test(
  'database test configuration is explicit and safe',
  {
    skip: IS_PRODUCTION
      ? 'Database tests must not run in production.'
      : CONFIG_ERROR || false,
  },
  () => {
    assert.ok(CONFIGURED_CLIENT);
    assert.ok(driverAvailable);
  },
);
test(
  'database driver and connection pool initialize',
  {
    skip: SHOULD_SKIP
      ? CONFIG_ERROR ||
        `Configured driver is unavailable: ${
          setupError ? setupError.message : 'unknown error'
        }`
      : false,
  },
  () => {
    ensureTestDatabase();
    assert.ok(pool);
  },
);
test(
  'database connection executes a basic read-only query',
  {
    skip: SHOULD_SKIP
      ? CONFIG_ERROR ||
        `Configured driver is unavailable: ${
          setupError ? setupError.message : 'unknown error'
        }`
      : false,
  },
  async () => {
    const result = await executeReadOnlyProbe();
    assert.equal(resultValue(result), 1);
  },
);
test(
  'database connection can execute repeated queries',
  {
    skip: SHOULD_SKIP
      ? CONFIG_ERROR ||
        `Configured driver is unavailable: ${
          setupError ? setupError.message : 'unknown error'
        }`
      : false,
  },
  async () => {
    for (let index = 0; index < 3; index += 1) {
      const result = await executeReadOnlyProbe();
      assert.equal(
        resultValue(result),
        1,
        `Read-only probe ${index + 1} failed.`,
      );
    }
  },
);
test(
  'database connection supports concurrent read-only queries',
  {
    skip: SHOULD_SKIP
      ? CONFIG_ERROR ||
        `Configured driver is unavailable: ${
          setupError ? setupError.message : 'unknown error'
        }`
      : false,
  },
  async () => {
    const results = await Promise.all(
      Array.from(
        { length: 3 },
        () => executeReadOnlyProbe(),
      ),
    );
    assert.equal(results.length, 3);
    for (const result of results) {
      assert.equal(resultValue(result), 1);
    }
  },
);
test(
  'database query failure does not permanently break the pool',
  {
    skip: SHOULD_SKIP
      ? CONFIG_ERROR ||
        `Configured driver is unavailable: ${
          setupError ? setupError.message : 'unknown error'
        }`
      : false,
  },
  async () => {
    ensureTestDatabase();
    let queryFailed = false;
    try {
      if (CONFIGURED_CLIENT === 'postgres') {
        await pool.query(
          'SELECT * FROM medorbits_test_table_that_does_not_exist',
        );
      } else {
        await pool.query(
          'SELECT * FROM medorbits_test_table_that_does_not_exist',
        );
      }
    } catch (error) {
      queryFailed = true;
      assert.ok(
        error && typeof error.message === 'string',
        'Expected a database error with a message.',
      );
    }
    assert.equal(
      queryFailed,
      true,
      'The deliberately invalid read query should fail.',
    );
    const recoveryResult = await executeReadOnlyProbe();
    assert.equal(resultValue(recoveryResult), 1);
  },
);
test(
  'database pool can acquire and release a connection',
  {
    skip: SHOULD_SKIP
      ? CONFIG_ERROR ||
        `Configured driver is unavailable: ${
          setupError ? setupError.message : 'unknown error'
        }`
      : false,
  },
  async () => {
    ensureTestDatabase();
    if (CONFIGURED_CLIENT === 'postgres') {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT 1 AS result');
        assert.equal(resultValue(result), 1);
      } finally {
        client.release();
      }
      return;
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT 1 AS result',
      );
      assert.equal(Number(rows[0].result), 1);
    } finally {
      connection.release();
    }
  },
);
test(
  'database test connection does not require schema mutations',
  {
    skip: SHOULD_SKIP
      ? CONFIG_ERROR ||
        `Configured driver is unavailable: ${
          setupError ? setupError.message : 'unknown error'
        }`
      : false,
  },
  async () => {
    const result = await executeReadOnlyProbe();
    assert.equal(resultValue(result), 1);
  },
);
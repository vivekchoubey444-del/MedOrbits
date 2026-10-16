'use strict';
/**
 * MedOrbits -- Database Index Tests
 *
 * File: tests/database/indexes.test.js
 *
 * Framework: Node.js built-in node:test
 *
 * Supported drivers:
 * - PostgreSQL: pg
 * - MySQL: mysql2/promise
 *
 * Run:
 *   node --test tests/database/indexes.test.js
 *
 * Required environment:
 *   NODE_ENV=test
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
 * - Refuses to run in production.
 * - Requires explicit test database configuration.
 * - Creates uniquely named test tables only.
 * - Does not alter existing application tables.
 * - Cleans up test tables and closes the connection.
 *
 * Note:
 * These tests validate index behavior on test tables. They do not prove
 * that the actual MedOrbits production schema has the required indexes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const CLIENT = (
  process.env.TEST_DATABASE_CLIENT || ''
).trim().toLowerCase();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const VALID_CLIENTS = ['postgres', 'mysql'];
const HAS_POSTGRES_CONFIG =
  /^postgres(?:ql)?:\/\//i.test(
    process.env.TEST_DATABASE_URL || '',
  );
const HAS_MYSQL_CONFIG = Boolean(
  process.env.TEST_DATABASE_HOST &&
  process.env.TEST_DATABASE_NAME &&
  process.env.TEST_DATABASE_USER,
);
const CONFIG_ERROR = IS_PRODUCTION
  ? 'Database index tests cannot run in production.'
  : !VALID_CLIENTS.includes(CLIENT)
    ? 'Set TEST_DATABASE_CLIENT to postgres or mysql.'
    : CLIENT === 'postgres' && !HAS_POSTGRES_CONFIG
      ? 'Set TEST_DATABASE_URL to a PostgreSQL test database.'
      : CLIENT === 'mysql' && !HAS_MYSQL_CONFIG
        ? 'Set TEST_DATABASE_HOST, TEST_DATABASE_NAME, and TEST_DATABASE_USER.'
        : null;
const SUFFIX = randomBytes(6).toString('hex');
const TABLES = Object.freeze({
  users: `mo_idx_users_${SUFFIX}`,
  applications: `mo_idx_apps_${SUFFIX}`,
  payments: `mo_idx_payments_${SUFFIX}`,
});
const INDEXES = Object.freeze({
  userEmail: `mo_idx_user_email_${SUFFIX}`,
  applicationStatus: `mo_idx_app_status_${SUFFIX}`,
  applicationOwnerStatus: `mo_idx_app_owner_status_${SUFFIX}`,
  paymentReference: `mo_idx_payment_ref_${SUFFIX}`,
});
let driver;
let connection;
let closeConnection = async () => {};
let setupError = null;
let connected = false;
let createdTables = [];
function quoteIdentifier(identifier) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error('Unsafe SQL identifier.');
  }
  return CLIENT === 'mysql'
    ? `\`${identifier}\``
    : `"${identifier}"`;
}
function table(name) {
  return quoteIdentifier(TABLES[name]);
}
function index(name) {
  return quoteIdentifier(INDEXES[name]);
}
async function query(sql, params = []) {
  if (!connection) {
    throw new Error('Database test connection is unavailable.');
  }
  if (CLIENT === 'postgres') {
    return connection.query(sql, params);
  }
  const [rows, fields] = await connection.execute(sql, params);
  return { rows, fields };
}
async function ddl(sql) {
  if (!connection) {
    throw new Error('Database test connection is unavailable.');
  }
  return connection.query(sql);
}
async function acquireConnection() {
  if (CLIENT === 'postgres') {
    const { Pool } = driver;
    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 5000,
      application_name: 'medorbits-index-tests',
      ...(process.env.TEST_DATABASE_SSL === 'true'
        ? {
            ssl: {
              rejectUnauthorized: true,
            },
          }
        : {}),
    });
    const client = await pool.connect();
    return {
      connection: client,
      close: async () => {
        client.release();
        await pool.end();
      },
    };
  }
  const mysqlConnection = await driver.createConnection({
    host: process.env.TEST_DATABASE_HOST,
    port: Number(process.env.TEST_DATABASE_PORT || 3306),
    database: process.env.TEST_DATABASE_NAME,
    user: process.env.TEST_DATABASE_USER,
    password: process.env.TEST_DATABASE_PASSWORD || '',
    connectTimeout: 5000,
    multipleStatements: false,
  });
  return {
    connection: mysqlConnection,
    close: async () => mysqlConnection.end(),
  };
}
async function createTables() {
  const users = table('users');
  const applications = table('applications');
  const payments = table('payments');
  await ddl(`
    CREATE TABLE ${users} (
      id INTEGER PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      display_name VARCHAR(120) NOT NULL
    )
  `);
  createdTables.push(TABLES.users);
  await ddl(`
    CREATE TABLE ${applications} (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      status VARCHAR(40) NOT NULL,
      created_at TIMESTAMP NOT NULL
    )
  `);
  createdTables.push(TABLES.applications);
  await ddl(`
    CREATE TABLE ${payments} (
      id INTEGER PRIMARY KEY,
      reference VARCHAR(100) NOT NULL,
      amount_minor INTEGER NOT NULL,
      status VARCHAR(40) NOT NULL
    )
  `);
  createdTables.push(TABLES.payments);
  // Unique index for lookup by user email.
  await ddl(`
    CREATE UNIQUE INDEX ${index('userEmail')}
    ON ${users} (email)
  `);
  // Single-column index for filtering application status.
  await ddl(`
    CREATE INDEX ${index('applicationStatus')}
    ON ${applications} (status)
  `);
  // Composite index for filtering a user's applications by status.
  await ddl(`
    CREATE INDEX ${index('applicationOwnerStatus')}
    ON ${applications} (user_id, status)
  `);
  // Unique payment reference prevents duplicate references.
  await ddl(`
    CREATE UNIQUE INDEX ${index('paymentReference')}
    ON ${payments} (reference)
  `);
}
async function cleanup() {
  const errors = [];
  for (const name of [...createdTables].reverse()) {
    try {
      await ddl(`DROP TABLE IF EXISTS ${quoteIdentifier(name)}`);
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
  createdTables = [];
  if (errors.length) {
    throw new Error(`Index test cleanup failed: ${errors.join('; ')}`);
  }
}
async function getIndexes(tableName) {
  if (CLIENT === 'postgres') {
    const result = await query(
      `
        SELECT
          indexname AS index_name,
          indexdef AS index_definition
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = $1
      `,
      [tableName],
    );
    return result.rows.map((row) => ({
      name: row.index_name,
      definition: row.index_definition,
    }));
  }
  const result = await connection.query(
    `SHOW INDEX FROM ${quoteIdentifier(tableName)}`,
  );
  return result[0].map((row) => ({
    name: row.Key_name,
    column: row.Column_name,
    nonUnique: Number(row.Non_unique),
    sequence: Number(row.Seq_in_index),
  }));
}
async function getExplain(sql, params = []) {
  if (CLIENT === 'postgres') {
    return query(`EXPLAIN ${sql}`, params);
  }
  // MySQL EXPLAIN supports prepared statements through execute().
  return query(`EXPLAIN ${sql}`, params);
}
function hasIndex(indexes, name) {
  return indexes.some((item) => item.name === name);
}
async function insertUser(id, email, displayName) {
  const placeholders =
    CLIENT === 'postgres' ? '$1, $2, $3' : '?, ?, ?';
  return query(
    `INSERT INTO ${table('users')} (id, email, display_name)
     VALUES (${placeholders})`,
    [id, email, displayName],
  );
}
async function insertApplication(id, userId, status, createdAt) {
  const placeholders =
    CLIENT === 'postgres' ? '$1, $2, $3, $4' : '?, ?, ?, ?';
  return query(
    `INSERT INTO ${table('applications')}
       (id, user_id, status, created_at)
     VALUES (${placeholders})`,
    [id, userId, status, createdAt],
  );
}
async function insertPayment(id, reference, amountMinor, status) {
  const placeholders =
    CLIENT === 'postgres' ? '$1, $2, $3, $4' : '?, ?, ?, ?';
  return query(
    `INSERT INTO ${table('payments')}
       (id, reference, amount_minor, status)
     VALUES (${placeholders})`,
    [id, reference, amountMinor, status],
  );
}
function skipReason() {
  if (CONFIG_ERROR) {
    return CONFIG_ERROR;
  }
  if (setupError) {
    return `Database setup failed: ${setupError.message}`;
  }
  if (!connected) {
    return 'Database connection was not initialized.';
  }
  return false;
}
const SHOULD_SKIP = Boolean(CONFIG_ERROR);
test.before(async () => {
  if (SHOULD_SKIP) {
    return;
  }
  try {
    driver = CLIENT === 'postgres'
      ? require('pg')
      : require('mysql2/promise');
    const acquired = await acquireConnection();
    connection = acquired.connection;
    closeConnection = acquired.close;
    connected = true;
    await createTables();
  } catch (error) {
    setupError = error;
    if (connected) {
      try {
        await cleanup();
      } catch {
        // Preserve the original setup error.
      }
    }
    try {
      await closeConnection();
    } catch {
      // Preserve the original setup error.
    }
    connection = null;
    connected = false;
  }
});
test.after(async () => {
  if (!connected) {
    return;
  }
  try {
    await cleanup();
  } finally {
    await closeConnection();
    connection = null;
    connected = false;
  }
});
test(
  'database index test environment initializes',
  { skip: CONFIG_ERROR || false },
  () => {
    if (setupError) {
      throw setupError;
    }
    assert.equal(connected, true);
    assert.equal(createdTables.length, 3);
  },
);
test(
  'unique user-email index exists',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    const indexes = await getIndexes(TABLES.users);
    assert.ok(
      hasIndex(indexes, INDEXES.userEmail),
      'Expected the unique user email index to exist.',
    );
    if (CLIENT === 'mysql') {
      const emailIndex = indexes.filter(
        (item) => item.name === INDEXES.userEmail,
      );
      assert.ok(emailIndex.length > 0);
      assert.ok(emailIndex.every((item) => item.nonUnique === 0));
    }
  },
);
test(
  'application status index exists',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    const indexes = await getIndexes(TABLES.applications);
    assert.ok(
      hasIndex(indexes, INDEXES.applicationStatus),
      'Expected the application status index to exist.',
    );
  },
);
test(
  'composite application owner-status index exists',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    const indexes = await getIndexes(TABLES.applications);
    assert.ok(
      hasIndex(indexes, INDEXES.applicationOwnerStatus),
      'Expected the composite user_id/status index to exist.',
    );
    if (CLIENT === 'mysql') {
      const composite = indexes
        .filter((item) => item.name === INDEXES.applicationOwnerStatus)
        .sort((a, b) => a.sequence - b.sequence);
      assert.deepEqual(
        composite.map((item) => item.column),
        ['user_id', 'status'],
      );
    }
  },
);
test(
  'unique payment reference index exists',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    const indexes = await getIndexes(TABLES.payments);
    assert.ok(
      hasIndex(indexes, INDEXES.paymentReference),
      'Expected the unique payment reference index to exist.',
    );
    if (CLIENT === 'mysql') {
      const paymentIndex = indexes.filter(
        (item) => item.name === INDEXES.paymentReference,
      );
      assert.ok(paymentIndex.every((item) => item.nonUnique === 0));
    }
  },
);
test(
  'email index supports correct lookup results',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    await insertUser(1, 'indexed.user@example.test', 'Indexed User');
    await insertUser(2, 'other.user@example.test', 'Other User');
    const placeholder = CLIENT === 'postgres' ? '$1' : '?';
    const result = await query(
      `SELECT id, email
       FROM ${table('users')}
       WHERE email = ${placeholder}`,
      ['indexed.user@example.test'],
    );
    assert.equal(result.rows.length, 1);
    assert.equal(Number(result.rows[0].id), 1);
    assert.equal(
      result.rows[0].email,
      'indexed.user@example.test',
    );
  },
);
test(
  'unique email index rejects duplicate email values',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    await insertUser(10, 'unique.user@example.test', 'First User');
    await assert.rejects(
      insertUser(11, 'unique.user@example.test', 'Duplicate User'),
      (error) => {
        if (CLIENT === 'postgres') {
          return error.code === '23505';
        }
        return error.code === 'ER_DUP_ENTRY';
      },
    );
  },
);
test(
  'unique payment reference index rejects duplicates',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    await insertPayment(1, 'payment-reference-001', 15000, 'pending');
    await assert.rejects(
      insertPayment(2, 'payment-reference-001', 15000, 'pending'),
      (error) => {
        if (CLIENT === 'postgres') {
          return error.code === '23505';
        }
        return error.code === 'ER_DUP_ENTRY';
      },
    );
  },
);
test(
  'indexed application status lookup returns matching records',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    const timestamp = '2026-01-01 10:00:00';
    await insertApplication(1, 101, 'pending', timestamp);
    await insertApplication(2, 102, 'approved', timestamp);
    await insertApplication(3, 103, 'pending', timestamp);
    const placeholder = CLIENT === 'postgres' ? '$1' : '?';
    const result = await query(
      `SELECT id
       FROM ${table('applications')}
       WHERE status = ${placeholder}
       ORDER BY id`,
      ['pending'],
    );
    assert.deepEqual(
      result.rows.map((row) => Number(row.id)),
      [1, 3],
    );
  },
);
test(
  'composite index query returns only the selected user applications',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    const timestamp = '2026-01-01 10:00:00';
    await insertApplication(11, 501, 'pending', timestamp);
    await insertApplication(12, 501, 'approved', timestamp);
    await insertApplication(13, 502, 'pending', timestamp);
    const placeholders =
      CLIENT === 'postgres' ? '$1 AND status = $2' : '? AND status = ?';
    const result = await query(
      `SELECT id
       FROM ${table('applications')}
       WHERE user_id = ${placeholders.split(' AND ')[0]}
         AND status = ${placeholders.split(' AND ')[1]}`,
      [501, 'pending'],
    );
    assert.deepEqual(
      result.rows.map((row) => Number(row.id)),
      [11],
    );
  },
);
test(
  'index-backed queries remain correct with parameterized inputs',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) throw new Error(skipReason());
    const email = "test' OR '1'='1";
    await insertUser(20, email, 'Parameterized Query Test');
    const placeholder = CLIENT === 'postgres' ? '$1' : '?';
    const result = await query(
      `SELECT id
       FROM ${table('users')}
       WHERE email = ${placeholder}`,
      [email],
    );
    assert.equal(result.rows.length, 1);
    assert.equal(Number(result.rows[0].id), 20);
  },
);
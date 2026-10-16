'use strict';
/**
 * MedOrbits -- Database Constraint Tests
 *
 * File: tests/database/constraints.test.js
 *
 * Framework: Node.js built-in node:test
 *
 * Supported databases:
 * - PostgreSQL (pg)
 * - MySQL (mysql2/promise)
 *
 * Run:
 *   node --test tests/database/constraints.test.js
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
 * - Requires an explicit test database configuration.
 * - Creates uniquely named temporary test tables.
 * - Does not modify existing application tables.
 * - Attempts to remove created tables during cleanup.
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
  ? 'Database constraint tests cannot run in production.'
  : !VALID_CLIENTS.includes(CLIENT)
    ? 'Set TEST_DATABASE_CLIENT to postgres or mysql.'
    : CLIENT === 'postgres' && !HAS_POSTGRES_CONFIG
      ? 'Set TEST_DATABASE_URL to a PostgreSQL test database.'
      : CLIENT === 'mysql' && !HAS_MYSQL_CONFIG
        ? 'Set TEST_DATABASE_HOST, TEST_DATABASE_NAME, and TEST_DATABASE_USER.'
        : null;
const SHOULD_SKIP = Boolean(CONFIG_ERROR);
const SUFFIX = randomBytes(6).toString('hex');
const TABLES = Object.freeze({
  parent: `mo_constraint_parent_${SUFFIX}`,
  child: `mo_constraint_child_${SUFFIX}`,
  unique: `mo_constraint_unique_${SUFFIX}`,
  checks: `mo_constraint_checks_${SUFFIX}`,
  notNull: `mo_constraint_not_null_${SUFFIX}`,
});
let driver;
let connection;
let setupError;
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
function tableName(name) {
  return quoteIdentifier(TABLES[name]);
}
async function execute(sql, params = []) {
  if (!connection) {
    throw new Error('Database test connection is unavailable.');
  }
  if (CLIENT === 'postgres') {
    return connection.query(sql, params);
  }
  const [rows, fields] = await connection.execute(sql, params);
  return {
    rows,
    fields,
  };
}
async function executeDDL(sql) {
  if (CLIENT === 'postgres') {
    return connection.query(sql);
  }
  return connection.query(sql);
}
async function acquireConnection() {
  if (CLIENT === 'postgres') {
    const Pool = driver.Pool;
    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 5000,
      application_name: 'medorbits-constraint-tests',
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
let closeConnection = async () => {};
async function createTables() {
  const parent = tableName('parent');
  const child = tableName('child');
  const unique = tableName('unique');
  const checks = tableName('checks');
  const notNull = tableName('notNull');
  const integerType = 'INTEGER';
  await executeDDL(`
    CREATE TABLE ${parent} (
      id ${integerType} PRIMARY KEY
    )
  `);
  createdTables.push(TABLES.parent);
  await executeDDL(`
    CREATE TABLE ${child} (
      id ${integerType} PRIMARY KEY,
      parent_id ${integerType} NOT NULL,
      CONSTRAINT mo_fk_${SUFFIX}
        FOREIGN KEY (parent_id)
        REFERENCES ${parent}(id)
    )
  `);
  createdTables.push(TABLES.child);
  await executeDDL(`
    CREATE TABLE ${unique} (
      id ${integerType} PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      CONSTRAINT mo_unique_${SUFFIX} UNIQUE (email)
    )
  `);
  createdTables.push(TABLES.unique);
  await executeDDL(`
    CREATE TABLE ${checks} (
      id ${integerType} PRIMARY KEY,
      amount DECIMAL(12, 2) NOT NULL,
      CONSTRAINT mo_check_${SUFFIX} CHECK (amount >= 0)
    )
  `);
  createdTables.push(TABLES.checks);
  await executeDDL(`
    CREATE TABLE ${notNull} (
      id ${integerType} PRIMARY KEY,
      required_value VARCHAR(100) NOT NULL
    )
  `);
  createdTables.push(TABLES.notNull);
}
async function cleanupTables() {
  const cleanupErrors = [];
  for (const name of [...createdTables].reverse()) {
    try {
      await executeDDL(
        `DROP TABLE IF EXISTS ${quoteIdentifier(name)}`,
      );
    } catch (error) {
      cleanupErrors.push({
        table: name,
        message: error.message,
      });
    }
  }
  createdTables = [];
  if (cleanupErrors.length > 0) {
    throw new Error(
      `Failed to clean up constraint test tables: ${
        cleanupErrors
          .map((item) => `${item.table}: ${item.message}`)
          .join('; ')
      }`,
    );
  }
}
async function assertConstraintRejects(operation, label) {
  let error;
  try {
    await operation();
  } catch (caught) {
    error = caught;
  }
  assert.ok(
    error,
    `${label}: expected the database to reject invalid data.`,
  );
  return error;
}
function assertPrimaryKeyViolation(error) {
  if (CLIENT === 'postgres') {
    assert.equal(error.code, '23505');
  } else {
    assert.equal(error.code, 'ER_DUP_ENTRY');
  }
}
function assertForeignKeyViolation(error) {
  if (CLIENT === 'postgres') {
    assert.equal(error.code, '23503');
  } else {
    assert.equal(error.code, 'ER_NO_REFERENCED_ROW_2');
  }
}
function assertNotNullViolation(error) {
  if (CLIENT === 'postgres') {
    assert.equal(error.code, '23502');
  } else {
    assert.equal(error.code, 'ER_BAD_NULL_ERROR');
  }
}
function assertCheckViolation(error) {
  if (CLIENT === 'postgres') {
    assert.equal(error.code, '23514');
  } else {
    assert.ok(
      error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' ||
      error.errno === 3819,
      `Expected a MySQL CHECK constraint violation; received ${error.code}.`,
    );
  }
}
function assertUniqueViolation(error) {
  if (CLIENT === 'postgres') {
    assert.equal(error.code, '23505');
  } else {
    assert.equal(error.code, 'ER_DUP_ENTRY');
  }
}
test.before(async () => {
  if (SHOULD_SKIP) {
    return;
  }
  try {
    if (CLIENT === 'postgres') {
      driver = require('pg');
    } else {
      driver = require('mysql2/promise');
    }
    const acquired = await acquireConnection();
    connection = acquired.connection;
    closeConnection = acquired.close;
    connected = true;
    await createTables();
  } catch (error) {
    setupError = error;
    if (connected) {
      try {
        await cleanupTables();
      } catch {
        // Preserve the original setup error.
      }
    }
    if (closeConnection) {
      try {
        await closeConnection();
      } catch {
        // Preserve the original setup error.
      }
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
    await cleanupTables();
  } finally {
    await closeConnection();
    connection = null;
    connected = false;
  }
});
function skipReason() {
  if (CONFIG_ERROR) {
    return CONFIG_ERROR;
  }
  if (setupError) {
    return `Database setup failed: ${setupError.message}`;
  }
  if (!connected) {
    return 'Database test connection was not initialized.';
  }
  return false;
}
test(
  'test database connection is initialized',
  { skip: CONFIG_ERROR || false },
  () => {
    if (setupError) {
      throw setupError;
    }
    assert.equal(connected, true);
    assert.ok(connection);
    assert.equal(createdTables.length, 5);
  },
);
test(
  'primary key constraint rejects duplicate identifiers',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) {
      throw new Error(skipReason());
    }
    const table = tableName('parent');
    await execute(
      `INSERT INTO ${table} (id) VALUES (?)`.replace(
        /\?/g,
        CLIENT === 'postgres' ? '$1' : '?',
      ),
      [101],
    );
    const error = await assertConstraintRejects(
      () =>
        execute(
          `INSERT INTO ${table} (id) VALUES (${
            CLIENT === 'postgres' ? '$1' : '?'
          })`,
          [101],
        ),
      'Duplicate primary key',
    );
    assertPrimaryKeyViolation(error);
  },
);
test(
  'unique constraint rejects duplicate email values',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) {
      throw new Error(skipReason());
    }
    const table = tableName('unique');
    await execute(
      `INSERT INTO ${table} (id, email) VALUES (${
        CLIENT === 'postgres' ? '$1, $2' : '?, ?'
      })`,
      [1, 'duplicate@example.test'],
    );
    const error = await assertConstraintRejects(
      () =>
        execute(
          `INSERT INTO ${table} (id, email) VALUES (${
            CLIENT === 'postgres' ? '$1, $2' : '?, ?'
          })`,
          [2, 'duplicate@example.test'],
        ),
      'Duplicate unique value',
    );
    assertUniqueViolation(error);
  },
);
test(
  'foreign key constraint rejects a missing parent',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) {
      throw new Error(skipReason());
    }
    const child = tableName('child');
    const error = await assertConstraintRejects(
      () =>
        execute(
          `INSERT INTO ${child} (id, parent_id) VALUES (${
            CLIENT === 'postgres' ? '$1, $2' : '?, ?'
          })`,
          [1, 999999],
        ),
      'Foreign key referencing nonexistent parent',
    );
    assertForeignKeyViolation(error);
  },
);
test(
  'foreign key constraint accepts an existing parent',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) {
      throw new Error(skipReason());
    }
    const parent = tableName('parent');
    const child = tableName('child');
    await execute(
      `INSERT INTO ${parent} (id) VALUES (${
        CLIENT === 'postgres' ? '$1' : '?'
      })`,
      [202],
    );
    await execute(
      `INSERT INTO ${child} (id, parent_id) VALUES (${
        CLIENT === 'postgres' ? '$1, $2' : '?, ?'
      })`,
      [202, 202],
    );
    let result;
    if (CLIENT === 'postgres') {
      result = await execute(
        `SELECT id FROM ${child} WHERE id = $1`,
        [202],
      );
    } else {
      result = await execute(
        `SELECT id FROM ${child} WHERE id = ?`,
        [202],
      );
    }
    const rows = CLIENT === 'postgres' ? result.rows : result.rows;
    assert.equal(rows.length, 1);
    assert.equal(Number(rows[0].id), 202);
  },
);
test(
  'NOT NULL constraint rejects null values',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) {
      throw new Error(skipReason());
    }
    const table = tableName('notNull');
    const error = await assertConstraintRejects(
      () =>
        execute(
          `INSERT INTO ${table} (id, required_value) VALUES (${
            CLIENT === 'postgres' ? '$1, $2' : '?, ?'
          })`,
          [1, null],
        ),
      'NULL in required field',
    );
    assertNotNullViolation(error);
  },
);
test(
  'CHECK constraint rejects negative amounts',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) {
      throw new Error(skipReason());
    }
    const table = tableName('checks');
    const error = await assertConstraintRejects(
      () =>
        execute(
          `INSERT INTO ${table} (id, amount) VALUES (${
            CLIENT === 'postgres' ? '$1, $2' : '?, ?'
          })`,
          [1, -1],
        ),
      'Negative amount',
    );
    assertCheckViolation(error);
  },
);
test(
  'CHECK constraint accepts a zero amount',
  { skip: SHOULD_SKIP ? CONFIG_ERROR : false },
  async () => {
    if (skipReason()) {
      throw new Error(skipReason());
    }
    const table = tableName('checks');
    await execute(
      `INSERT INTO ${table} (id, amount) VALUES (${
        CLIENT === 'postgres' ? '$1, $2' : '?, ?'
      })`,
      [2, 0],
    );
    let result;
    if (CLIENT === 'postgres') {
      result = await execute(
        `SELECT amount FROM ${table} WHERE id = $1`,
        [2],
      );
    } else {
      result = await execute(
        `SELECT amount FROM ${table} WHERE id = ?`,
        [2],
      );
    }
    assert.equal(result.rows.length, 1);
    assert.equal(Number(result.rows[0].amount), 0);
  },
);
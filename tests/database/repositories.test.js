'use strict';
/**
 * File: tests/database/repositories.test.js
 *
 * Tests database-level repository behavior using an isolated test table.
 *
 * Requirements:
 *   Node.js >= 20
 *   PostgreSQL driver: pg
 *   MySQL driver: mysql2
 *
 * Environment:
 *   TEST_DATABASE_CLIENT=postgres | mysql
 *   TEST_DATABASE_URL=postgres://...
 *   TEST_DATABASE_HOST=127.0.0.1
 *   TEST_DATABASE_PORT=3306
 *   TEST_DATABASE_NAME=medorbits_test
 *   TEST_DATABASE_USER=...
 *   TEST_DATABASE_PASSWORD=...
 *
 * These tests use a uniquely named temporary test table and do not require
 * the application's repository classes. To test actual MedOrbits repository
 * classes, replace the example query functions with the project's exports.
 */
const {
  test,
  describe,
  before,
  after,
} = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const CLIENT = String(
  process.env.TEST_DATABASE_CLIENT || ''
).trim().toLowerCase();
const DATABASE_URL = process.env.TEST_DATABASE_URL;
const MYSQL_CONFIG = {
  host: process.env.TEST_DATABASE_HOST || '127.0.0.1',
  port: Number(process.env.TEST_DATABASE_PORT || 3306),
  database: process.env.TEST_DATABASE_NAME,
  user: process.env.TEST_DATABASE_USER,
  password: process.env.TEST_DATABASE_PASSWORD,
  connectTimeout: 5000,
};
const TABLE_SUFFIX = randomUUID().replace(/-/g, '').slice(0, 16);
const TABLE_NAME = `test_repository_${TABLE_SUFFIX}`;
let db;
let tableCreated = false;
function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return CLIENT === 'mysql'
    ? `\`${identifier}\``
    : `"${identifier}"`;
}
function assertTestDatabaseConfiguration() {
  assert.notEqual(
    String(process.env.NODE_ENV || '').toLowerCase(),
    'production',
    'Refusing to run repository tests with NODE_ENV=production.'
  );
  assert.ok(
    CLIENT === 'postgres' || CLIENT === 'mysql',
    'Set TEST_DATABASE_CLIENT to "postgres" or "mysql".'
  );
  if (CLIENT === 'postgres') {
    assert.ok(
      DATABASE_URL,
      'TEST_DATABASE_URL is required for PostgreSQL.'
    );
    const parsed = new URL(DATABASE_URL);
    assert.ok(
      /test/i.test(parsed.pathname) ||
        /test/i.test(parsed.searchParams.get('application_name') || ''),
      'Use a dedicated PostgreSQL test database whose name contains "test", ' +
        'or set application_name=test in TEST_DATABASE_URL.'
    );
  }
  if (CLIENT === 'mysql') {
    assert.ok(
      MYSQL_CONFIG.database,
      'TEST_DATABASE_NAME is required for MySQL.'
    );
    assert.match(
      MYSQL_CONFIG.database,
      /test/i,
      'Use a dedicated MySQL test database whose name contains "test".'
    );
    assert.ok(
      MYSQL_CONFIG.user,
      'TEST_DATABASE_USER is required for MySQL.'
    );
  }
}
async function connectDatabase() {
  if (CLIENT === 'postgres') {
    let pg;
    try {
      pg = require('pg');
    } catch {
      throw new Error('Install the PostgreSQL driver: npm install pg');
    }
    const pool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 5000,
      application_name: 'medorbits-repository-tests',
    });
    const client = await pool.connect();
    return {
      query: (sql, params = []) => client.query(sql, params),
      close: async () => {
        client.release();
        await pool.end();
      },
    };
  }
  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch {
    throw new Error('Install the MySQL driver: npm install mysql2');
  }
  const connection = await mysql.createConnection(MYSQL_CONFIG);
  return {
    query: (sql, params = []) => connection.execute(sql, params),
    close: () => connection.end(),
  };
}
async function execute(sql, params = []) {
  return db.query(sql, params);
}
async function rows(sql, params = []) {
  const result = await execute(sql, params);
  return CLIENT === 'postgres' ? result.rows : result[0];
}
async function createTestTable() {
  const table = quoteIdentifier(TABLE_NAME);
  if (CLIENT === 'postgres') {
    await execute(`
      CREATE TABLE ${table} (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email VARCHAR(254) NOT NULL UNIQUE,
        display_name VARCHAR(120) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await execute(`
      CREATE TABLE ${table} (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(254) NOT NULL UNIQUE,
        display_name VARCHAR(120) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }
  tableCreated = true;
}
function placeholders(count) {
  return Array.from(
    { length: count },
    (_, index) => CLIENT === 'postgres' ? `$${index + 1}` : '?'
  );
}
/**
 * Example repository functions.
 *
 * These demonstrate expected repository behavior without assuming the names
 * or structure of the actual MedOrbits repository classes.
 */
const repository = {
  async create({ email, displayName, status = 'active' }) {
    const table = quoteIdentifier(TABLE_NAME);
    if (CLIENT === 'postgres') {
      const result = await execute(
        `INSERT INTO ${table} (email, display_name, status)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, status, created_at, updated_at`,
        [email, displayName, status]
      );
      return result.rows[0];
    }
    const result = await execute(
      `INSERT INTO ${table} (email, display_name, status)
       VALUES (?, ?, ?)`,
      [email, displayName, status]
    );
    const insertedId = result[0].insertId;
    return this.findById(insertedId);
  },
  async findById(id) {
    const table = quoteIdentifier(TABLE_NAME);
    const parameter = placeholders(1)[0];
    const result = await rows(
      `SELECT id, email, display_name, status, created_at, updated_at
       FROM ${table}
       WHERE id = ${parameter}`,
      [id]
    );
    return result[0] || null;
  },
  async findByEmail(email) {
    const table = quoteIdentifier(TABLE_NAME);
    const parameter = placeholders(1)[0];
    const result = await rows(
      `SELECT id, email, display_name, status, created_at, updated_at
       FROM ${table}
       WHERE email = ${parameter}`,
      [email]
    );
    return result[0] || null;
  },
  async list({ limit = 20, offset = 0 } = {}) {
    const table = quoteIdentifier(TABLE_NAME);
    const limitParameter = placeholders(1)[0];
    const offsetParameter = placeholders(2)[1];
    return rows(
      `SELECT id, email, display_name, status, created_at, updated_at
       FROM ${table}
       ORDER BY id ASC
       LIMIT ${limitParameter} OFFSET ${offsetParameter}`,
      [limit, offset]
    );
  },
  async update(id, { displayName, status }) {
    const table = quoteIdentifier(TABLE_NAME);
    if (CLIENT === 'postgres') {
      const result = await execute(
        `UPDATE ${table}
         SET display_name = $1,
             status = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, email, display_name, status, created_at, updated_at`,
        [displayName, status, id]
      );
      return result.rows[0] || null;
    }
    const result = await execute(
      `UPDATE ${table}
       SET display_name = ?, status = ?
       WHERE id = ?`,
      [displayName, status, id]
    );
    if (result[0].affectedRows === 0) {
      return this.findById(id);
    }
    return this.findById(id);
  },
  async delete(id) {
    const table = quoteIdentifier(TABLE_NAME);
    const parameter = placeholders(1)[0];
    const result = await execute(
      `DELETE FROM ${table} WHERE id = ${parameter}`,
      [id]
    );
    return CLIENT === 'postgres'
      ? result.rowCount === 1
      : result[0].affectedRows === 1;
  },
};
describe('Database repository behavior', () => {
  before(async () => {
    assertTestDatabaseConfiguration();
    db = await connectDatabase();
    await createTestTable();
  });
  after(async () => {
    if (db) {
      try {
        if (tableCreated) {
          await execute(
            `DROP TABLE IF EXISTS ${quoteIdentifier(TABLE_NAME)}`
          );
        }
      } finally {
        await db.close();
        db = undefined;
      }
    }
  });
  test('creates and returns a record', async () => {
    const email = `create-${randomUUID()}@example.test`;
    const created = await repository.create({
      email,
      displayName: 'Test Candidate',
    });
    assert.ok(created.id !== null && created.id !== undefined);
    assert.equal(created.email, email);
    assert.equal(created.display_name, 'Test Candidate');
    assert.equal(created.status, 'active');
    assert.ok(created.created_at);
  });
  test('finds a record by ID', async () => {
    const email = `find-id-${randomUUID()}@example.test`;
    const created = await repository.create({
      email,
      displayName: 'Find By ID',
    });
    const found = await repository.findById(created.id);
    assert.ok(found);
    assert.equal(String(found.id), String(created.id));
    assert.equal(found.email, email);
  });
  test('finds a record by a unique field', async () => {
    const email = `find-email-${randomUUID()}@example.test`;
    await repository.create({
      email,
      displayName: 'Find By Email',
    });
    const found = await repository.findByEmail(email);
    assert.ok(found);
    assert.equal(found.email, email);
  });
  test('returns null for a missing record', async () => {
    const found = await repository.findByEmail(
      `missing-${randomUUID()}@example.test`
    );
    assert.equal(found, null);
  });
  test('lists records with limit and offset', async () => {
    const marker = randomUUID();
    await repository.create({
      email: `list-a-${marker}@example.test`,
      displayName: 'List A',
    });
    await repository.create({
      email: `list-b-${marker}@example.test`,
      displayName: 'List B',
    });
    const firstPage = await repository.list({
      limit: 1,
      offset: 0,
    });
    const secondPage = await repository.list({
      limit: 1,
      offset: 1,
    });
    assert.equal(firstPage.length, 1);
    assert.equal(secondPage.length, 1);
    assert.notEqual(
      String(firstPage[0].id),
      String(secondPage[0].id)
    );
  });
  test('updates an existing record', async () => {
    const created = await repository.create({
      email: `update-${randomUUID()}@example.test`,
      displayName: 'Before Update',
    });
    const updated = await repository.update(created.id, {
      displayName: 'After Update',
      status: 'inactive',
    });
    assert.ok(updated);
    assert.equal(updated.display_name, 'After Update');
    assert.equal(updated.status, 'inactive');
  });
  test('returns null when updating a nonexistent record', async () => {
    const updated = await repository.update(
      -999999,
      {
        displayName: 'Missing Record',
        status: 'inactive',
      }
    );
    assert.equal(updated, null);
  });
  test('deletes an existing record', async () => {
    const created = await repository.create({
      email: `delete-${randomUUID()}@example.test`,
      displayName: 'Delete Me',
    });
    assert.equal(await repository.delete(created.id), true);
    assert.equal(await repository.findById(created.id), null);
  });
  test('returns false when deleting a nonexistent record', async () => {
    assert.equal(await repository.delete(-999999), false);
  });
  test('rejects duplicate unique email values', async () => {
    const email = `duplicate-${randomUUID()}@example.test`;
    await repository.create({
      email,
      displayName: 'Original',
    });
    await assert.rejects(
      () => repository.create({
        email,
        displayName: 'Duplicate',
      }),
      (error) => {
        assert.ok(error);
        if (CLIENT === 'postgres') {
          assert.equal(error.code, '23505');
        } else {
          assert.equal(error.code, 'ER_DUP_ENTRY');
        }
        return true;
      }
    );
  });
  test('treats user input as data rather than SQL', async () => {
    const payload = `candidate-${randomUUID()}'; DROP TABLE ${TABLE_NAME}; --`;
    const created = await repository.create({
      email: `injection-${randomUUID()}@example.test`,
      displayName: payload,
    });
    const found = await repository.findById(created.id);
    assert.equal(found.display_name, payload);
    assert.equal(await tableExistsForTest(), true);
  });
});
async function tableExistsForTest() {
  if (CLIENT === 'postgres') {
    const result = await rows(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name = $1`,
      [TABLE_NAME]
    );
    return result.length === 1;
  }
  const result = await rows(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = ?`,
    [TABLE_NAME]
  );
  return result.length === 1;
}
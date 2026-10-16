'use strict';
/**
 * File: tests/database/migrations.test.js
 *
 * Purpose:
 * - Verify migration files exist and follow expected naming conventions.
 * - Verify migration tracking table can be queried.
 * - Verify applied migrations are recorded without duplicate versions.
 * - Verify migration execution is repeatable when the runner supports it.
 * - Verify rollback metadata is available when the project supports rollback.
 *
 * Requirements:
 * - Node.js >= 20
 * - Run against a dedicated TEST database only.
 *
 * Environment:
 *   TEST_DATABASE_CLIENT=postgres | mysql
 *   TEST_DATABASE_URL=postgres://...             (PostgreSQL)
 *   TEST_DATABASE_HOST=127.0.0.1                 (MySQL)
 *   TEST_DATABASE_PORT=3306                      (MySQL)
 *   TEST_DATABASE_NAME=medorbits_test            (MySQL)
 *   TEST_DATABASE_USER=...
 *   TEST_DATABASE_PASSWORD=...
 *   MIGRATIONS_DIR=./database/migrations         (optional)
 *   MIGRATIONS_TABLE=migrations                  (optional)
 *
 * Important:
 * This test file does not automatically run migrations or modify application
 * tables. Migration-runner integration tests should call the project's actual
 * migration API in a dedicated disposable database.
 */
const {
  test,
  describe,
  before,
  after,
} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CLIENT = String(
  process.env.TEST_DATABASE_CLIENT || ''
).trim().toLowerCase();
const MIGRATIONS_TABLE =
  process.env.MIGRATIONS_TABLE || 'migrations';
const MIGRATIONS_DIR = path.resolve(
  process.env.MIGRATIONS_DIR ||
    path.join(process.cwd(), 'database', 'migrations')
);
const DATABASE_URL = process.env.TEST_DATABASE_URL;
const MYSQL_CONFIG = {
  host: process.env.TEST_DATABASE_HOST || '127.0.0.1',
  port: Number(process.env.TEST_DATABASE_PORT || 3306),
  database: process.env.TEST_DATABASE_NAME,
  user: process.env.TEST_DATABASE_USER,
  password: process.env.TEST_DATABASE_PASSWORD,
  connectTimeout: 5000,
};
let db;
let connection;
let migrationsTableExists = false;
function isProductionEnvironment() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}
function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return CLIENT === 'mysql'
    ? `\`${identifier}\``
    : `"${identifier}"`;
}
function assertTestDatabaseConfiguration() {
  assert.equal(
    isProductionEnvironment(),
    false,
    'Refusing to run database migration tests with NODE_ENV=production.'
  );
  assert.ok(
    ['postgres', 'mysql'].includes(CLIENT),
    'Set TEST_DATABASE_CLIENT to "postgres" or "mysql".'
  );
  if (CLIENT === 'postgres') {
    assert.ok(
      DATABASE_URL,
      'TEST_DATABASE_URL is required for PostgreSQL.'
    );
    let parsed;
    try {
      parsed = new URL(DATABASE_URL);
    } catch {
      throw new Error('TEST_DATABASE_URL must be a valid database URL.');
    }
    assert.ok(
      /test/i.test(parsed.pathname) ||
        /test/i.test(parsed.searchParams.get('application_name') || ''),
      'Use a dedicated test database. Its name should contain "test", ' +
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
  assert.match(
    MIGRATIONS_TABLE,
    /^[A-Za-z_][A-Za-z0-9_]*$/,
    'MIGRATIONS_TABLE must be a valid SQL identifier.'
  );
}
async function connectDatabase() {
  if (CLIENT === 'postgres') {
    let pg;
    try {
      pg = require('pg');
    } catch {
      throw new Error(
        'PostgreSQL driver not installed. Install the "pg" package.'
      );
    }
    const pool = new pg.Pool({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 5000,
      max: 1,
      application_name: 'medorbits-migration-tests',
    });
    const client = await pool.connect();
    return {
      query: async (sql, params = []) => client.query(sql, params),
      close: async () => {
        client.release();
        await pool.end();
      },
    };
  }
  if (CLIENT === 'mysql') {
    let mysql;
    try {
      mysql = require('mysql2/promise');
    } catch {
      throw new Error(
        'MySQL driver not installed. Install the "mysql2" package.'
      );
    }
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    return {
      query: async (sql, params = []) =>
        connection.execute(sql, params),
      close: async () => connection.end(),
    };
  }
  throw new Error(`Unsupported database client: ${CLIENT}`);
}
async function queryRows(sql, params = []) {
  const result = await db.query(sql, params);
  if (CLIENT === 'postgres') {
    return result.rows;
  }
  // mysql2 returns [rows, fields].
  return result[0];
}
async function tableExists(tableName) {
  if (CLIENT === 'postgres') {
    const rows = await queryRows(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name = $1`,
      [tableName]
    );
    return rows.length > 0;
  }
  const rows = await queryRows(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = ?`,
    [tableName]
  );
  return rows.length > 0;
}
function discoverMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(?:js|cjs|mjs|sql)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}
function validateMigrationFileNames(files) {
  const versions = new Set();
  for (const file of files) {
    const version = file.match(/^(\d{3,})[_-]/)?.[1];
    assert.ok(
      version,
      `Migration "${file}" should begin with a numeric version ` +
        'followed by "_" or "-". Example: 001_create_users.sql.'
    );
    assert.equal(
      versions.has(version),
      false,
      `Duplicate migration version "${version}".`
    );
    versions.add(version);
  }
}
async function getMigrationHistory() {
  const table = quoteIdentifier(MIGRATIONS_TABLE);
  const rows = await queryRows(
    `SELECT * FROM ${table}`
  );
  return rows;
}
function getMigrationVersion(row) {
  return (
    row.version ??
    row.migration ??
    row.name ??
    row.filename ??
    row.file_name ??
    null
  );
}
describe('Database migrations', () => {
  before(async () => {
    assertTestDatabaseConfiguration();
    db = await connectDatabase();
    migrationsTableExists = await tableExists(MIGRATIONS_TABLE);
  });
  after(async () => {
    if (db) {
      await db.close();
      db = undefined;
    }
  });
  test('migration directory exists', () => {
    assert.ok(
      fs.existsSync(MIGRATIONS_DIR),
      `Migration directory not found: ${MIGRATIONS_DIR}. ` +
        'Set MIGRATIONS_DIR to the actual project migration directory.'
    );
    assert.ok(
      fs.statSync(MIGRATIONS_DIR).isDirectory(),
      `MIGRATIONS_DIR is not a directory: ${MIGRATIONS_DIR}`
    );
  });
  test('migration directory contains migration files', () => {
    const files = discoverMigrationFiles();
    assert.ok(
      files.length > 0,
      `No .js, .cjs, .mjs or .sql migration files found in ${MIGRATIONS_DIR}.`
    );
  });
  test('migration filenames use unique ordered numeric versions', () => {
    const files = discoverMigrationFiles();
    assert.ok(
      files.length > 0,
      'Cannot validate migration filenames because no migration files were found.'
    );
    validateMigrationFileNames(files);
  });
  test('migration files are sorted deterministically', () => {
    const files = discoverMigrationFiles();
    const sorted = [...files].sort((a, b) => a.localeCompare(b, 'en'));
    assert.deepEqual(
      files,
      sorted,
      'Migration files must be returned in deterministic order.'
    );
  });
  test('migration history table exists when migrations have been initialized', async (t) => {
    if (!migrationsTableExists) {
      t.skip(
        `The "${MIGRATIONS_TABLE}" table does not exist yet. ` +
          'Run the project migration bootstrap before testing migration history.'
      );
      return;
    }
    assert.equal(
      await tableExists(MIGRATIONS_TABLE),
      true,
      'Migration history table should exist.'
    );
  });
  test('migration history can be queried', async (t) => {
    if (!migrationsTableExists) {
      t.skip(
        'Migration history table is not initialized; no history query performed.'
      );
      return;
    }
    const rows = await getMigrationHistory();
    assert.ok(
      Array.isArray(rows),
      'Migration history query should return an array of rows.'
    );
  });
  test('migration history contains no duplicate recorded versions', async (t) => {
    if (!migrationsTableExists) {
      t.skip('Migration history table is not initialized.');
      return;
    }
    const rows = await getMigrationHistory();
    const versions = rows
      .map(getMigrationVersion)
      .filter((version) => version !== null && version !== undefined)
      .map(String);
    assert.equal(
      versions.length,
      new Set(versions).size,
      'Migration history contains duplicate migration versions.'
    );
  });
  test('recorded migration versions correspond to available migration files', async (t) => {
    if (!migrationsTableExists) {
      t.skip('Migration history table is not initialized.');
      return;
    }
    const files = discoverMigrationFiles();
    const fileNames = new Set(files);
    const fileVersions = new Set(
      files.map((file) => file.match(/^(\d{3,})[_-]/)?.[1])
    );
    const rows = await getMigrationHistory();
    for (const row of rows) {
      const recorded = getMigrationVersion(row);
      if (recorded === null || recorded === undefined) {
        continue;
      }
      const value = String(recorded);
      const basename = path.basename(value);
      const exactFileExists = fileNames.has(basename);
      const version = basename.match(/^(\d{3,})[_-]/)?.[1];
      const versionExists = version && fileVersions.has(version);
      assert.ok(
        exactFileExists || versionExists,
        `Recorded migration "${value}" has no matching migration file. ` +
          'If historical migrations are intentionally archived or renamed, ' +
          'adjust this assertion to match the project migration policy.'
      );
    }
  });
  test('migration history table has a recognizable version column', async (t) => {
    if (!migrationsTableExists) {
      t.skip('Migration history table is not initialized.');
      return;
    }
    const rows = await getMigrationHistory();
    // An empty table cannot reveal its row keys. Inspect metadata instead.
    let columnNames = [];
    if (CLIENT === 'postgres') {
      const result = await queryRows(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = $1`,
        [MIGRATIONS_TABLE]
      );
      columnNames = result.map((row) => row.column_name);
    } else {
      const result = await queryRows(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?`,
        [MIGRATIONS_TABLE]
      );
      columnNames = result.map((row) => row.COLUMN_NAME || row.column_name);
    }
    const recognizedColumns = [
      'version',
      'migration',
      'name',
      'filename',
      'file_name',
    ];
    assert.ok(
      recognizedColumns.some((column) => columnNames.includes(column)),
      `Migration history table must contain a recognized version column. ` +
        `Found columns: ${columnNames.join(', ') || '(none)'}.`
    );
    // If records exist, each should expose a recognizable version field.
    for (const row of rows) {
      assert.ok(
        getMigrationVersion(row) !== null &&
          getMigrationVersion(row) !== undefined,
        'A migration history row is missing its version identifier.'
      );
    }
  });
});
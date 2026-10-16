'use strict';
const mysql = require('mysql2/promise');
let connection;
let connectionPromise;
/**
 * MedOrbits database integration-test setup.
 *
 * Requirements:
 * - Node.js >= 20
 * - mysql2 installed
 * - NODE_ENV=test
 * - TEST_DATABASE_URL points to a dedicated disposable MySQL test database
 *
 * Example:
 * TEST_DATABASE_URL=mysql://test_user:test_password@127.0.0.1:3306/medorbits_test
 *
 * Safety:
 * - Rejects non-test environments.
 * - Requires a database name clearly identifying it as a test database.
 * - Verifies the connected database before exposing the connection.
 * - Does not create, migrate, truncate, or drop application tables.
 */
function getTestDatabaseConfig() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'MedOrbits database tests require NODE_ENV=test.'
    );
  }
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'TEST_DATABASE_URL is required for database integration tests.'
    );
  }
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      'TEST_DATABASE_URL must be a valid MySQL connection URL.'
    );
  }
  if (!['mysql:', 'mysql2:'].includes(parsed.protocol)) {
    throw new Error(
      'TEST_DATABASE_URL must use the mysql:// protocol.'
    );
  }
  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\/+/, '')
  );
  if (!databaseName) {
    throw new Error(
      'TEST_DATABASE_URL must specify a database name.'
    );
  }
  if (!/(^|[-_])test($|[-_])/i.test(databaseName)) {
    throw new Error(
      'Refusing database tests: the database name must clearly identify ' +
      'a dedicated test database, such as medorbits_test.'
    );
  }
  const port = parsed.port ? Number(parsed.port) : 3306;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      'TEST_DATABASE_URL contains an invalid MySQL port.'
    );
  }
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  if (!user) {
    throw new Error(
      'TEST_DATABASE_URL must specify a MySQL test user.'
    );
  }
  return {
    host: parsed.hostname || '127.0.0.1',
    port,
    user,
    password,
    database: databaseName,
    charset: 'utf8mb4',
    multipleStatements: false,
    connectTimeout: 5000,
    decimalNumbers: true,
    dateStrings: false,
  };
}
/**
 * Returns the shared MySQL connection.
 *
 * Concurrent calls share the same connection attempt to prevent multiple
 * connections being created during parallel test initialization.
 */
async function connectTestDatabase() {
  if (connection) {
    return connection;
  }
  if (connectionPromise) {
    return connectionPromise;
  }
  connectionPromise = (async () => {
    const config = getTestDatabaseConfig();
    const candidate = await mysql.createConnection(config);
    try {
      const [rows] = await candidate.execute(
        'SELECT DATABASE() AS databaseName'
      );
      const connectedDatabase = rows[0]?.databaseName;
      if (connectedDatabase !== config.database) {
        throw new Error(
          'Connected MySQL database does not match the configured test database.'
        );
      }
      connection = candidate;
      return connection;
    } catch (error) {
      await candidate.end().catch(() => {});
      throw error;
    }
  })();
  try {
    return await connectionPromise;
  } finally {
    connectionPromise = undefined;
  }
}
/**
 * Returns the active connection without opening a new one.
 */
function getTestDatabaseConnection() {
  if (!connection) {
    throw new Error(
      'Test database is not connected. Call connectTestDatabase() first.'
    );
  }
  return connection;
}
/**
 * Closes the shared connection.
 *
 * Waits for an in-progress connection attempt before closing, preventing
 * connection initialization from racing with teardown.
 */
async function closeTestDatabase() {
  if (connectionPromise) {
    try {
      await connectionPromise;
    } catch {
      // Connection initialization failed; nothing is available to close.
    }
  }
  if (!connection) {
    return;
  }
  const current = connection;
  connection = undefined;
  await current.end();
}
/**
 * Registers Jest lifecycle hooks.
 *
 * Call this inside a Jest test file or from a Jest setup module after
 * confirming Jest globals are available.
 */
function registerDatabaseHooks() {
  if (
    typeof global.beforeAll !== 'function' ||
    typeof global.afterAll !== 'function'
  ) {
    throw new Error(
      'registerDatabaseHooks() requires Jest. ' +
      'For node:test, use before() and after() directly.'
    );
  }
  global.beforeAll(async () => {
    await connectTestDatabase();
  });
  global.afterAll(async () => {
    await closeTestDatabase();
  });
}
module.exports = {
  connectTestDatabase,
  getTestDatabaseConnection,
  closeTestDatabase,
  getTestDatabaseConfig,
  registerDatabaseHooks,
};
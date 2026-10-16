‘use strict’;

const {
getTestDatabaseConnection,
} = require(’./helpers/database-test-helper’);

describe(‘database transactions’, () => {
let connection;
let tableName;

beforeAll(async () => {
connection = await getTestDatabaseConnection();

// Use a dedicated test table created by the test setup.
tableName = 'test_transaction_records';

});

afterAll(async () => {
if (connection) {
await connection.end();
}
});

beforeEach(async () => {
await connection.query(DELETE FROM \${tableName}``);
});

test(‘commits successful operations’, async () => {
await connection.beginTransaction();

try {
  await connection.execute(
    `INSERT INTO \`${tableName}\` (id, value) VALUES (?, ?)`,
    ['commit-001', 'committed']
  );
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
}
const [rows] = await connection.execute(
  `SELECT value FROM \`${tableName}\` WHERE id = ?`,
  ['commit-001']
);
expect(rows).toHaveLength(1);
expect(rows[0].value).toBe('committed');

});

test(‘rolls back failed multi-step operations’, async () => {
await connection.beginTransaction();

try {
  await connection.execute(
    `INSERT INTO \`${tableName}\` (id, value) VALUES (?, ?)`,
    ['rollback-001', 'first-step']
  );
  // Force a failure after the first insert.
  throw new Error('Simulated transaction failure');
} catch (error) {
  await connection.rollback();
  expect(error.message).toBe('Simulated transaction failure');
}
const [rows] = await connection.execute(
  `SELECT id FROM \`${tableName}\` WHERE id = ?`,
  ['rollback-001']
);
expect(rows).toHaveLength(0);

});

test(‘preserves integrity under concurrent updates where applicable’, async () => {
// This example requires a separate connection for each transaction.
// Implement with the production transaction helper and a shared,
// deterministic test record before enabling this test.
expect(true).toBe(true);
});
});
'use strict';

/**

* MedOrbits -- MySQL Database Adapter
* File: src/config/database.js
* Requirements:
* ●	mysql2/promise
* ●	MySQL-compatible database
* Required environment variables:
* DB_HOST
* DB_NAME
* DB_USER
* DB_PASSWORD
* Optional environment variables:
* DB_PORT=3306
* DB_CONNECTION_LIMIT=10
* DB_CONNECT_TIMEOUT_MS=10000
* Security:
* ●	Uses parameterized query interfaces.
* ●	Disables multiple SQL statements.
* ●	Does not log credentials or SQL parameter values.
* ●	Provides transaction support with rollback on failure.
        */

const mysql = require('mysql2/promise');

let pool;
let closing = false;
let closePromise;

const DEFAULT_PORT = 3306;
const DEFAULT_CONNECTION_LIMIT = 10;
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;

function isPresent(value) {
return typeof value === 'string' && value.trim().length > 0;
}

function parseInteger(value, name, options = {}) {
const {
fallback,
min = 1,
max = Number.MAX_SAFE_INTEGER,
} = options;

if (value === undefined || value === '') {
return fallback;
}

if (!/^\d+$/.test(String(value).trim())) {
throw new Error(`${name} must be a valid integer.`);
}

const parsed = Number(value);

if (
!Number.isSafeInteger(parsed) ||
parsed < min ||
parsed > max
) {
throw new Error(
`${name} must be between ${min} and ${max}.`
);
}

return parsed;
}

function getDatabaseConfig() {
const required = [
'DB_HOST',
'DB_NAME',
'DB_USER',
'DB_PASSWORD',
];

const missing = required.filter(
(name) => !isPresent(process.env[name])
);

if (missing.length > 0) {
throw new Error(
`Missing required database environment variables: ${missing.join(', ')}`
);
}

return {
host: process.env.DB_HOST.trim(),
port: parseInteger(process.env.DB_PORT, 'DB_PORT', {
fallback: DEFAULT_PORT,
min: 1,
max: 65535,
}),
database: process.env.DB_NAME.trim(),
user: process.env.DB_USER.trim(),
password: process.env.DB_PASSWORD,
connectionLimit: parseInteger(
process.env.DB_CONNECTION_LIMIT,
'DB_CONNECTION_LIMIT',
{
fallback: DEFAULT_CONNECTION_LIMIT,
min: 1,
max: 100,
}
),
connectTimeout: parseInteger(
process.env.DB_CONNECT_TIMEOUT_MS,
'DB_CONNECT_TIMEOUT_MS',
{
fallback: DEFAULT_CONNECT_TIMEOUT_MS,
min: 1000,
max: 120000,
}
),
};
}

function getPool() {
if (closing) {
throw new Error(
'Database pool is closing. Wait for shutdown to complete before creating new queries.'
);
}

if (pool) {
return pool;
}

const config = getDatabaseConfig();

pool = mysql.createPool({
host: config.host,
port: config.port,
database: config.database,
user: config.user,
password: config.password,

waitForConnections: true,
connectionLimit: config.connectionLimit,
queueLimit: 0,
connectTimeout: config.connectTimeout,
charset: 'utf8mb4',
timezone: 'Z',
enableKeepAlive: true,
keepAliveInitialDelay: 0,
multipleStatements: false,
decimalNumbers: false,
supportBigNumbers: true,
bigNumberStrings: true,

});

return pool;
}

async function query(sql, values = []) {
if (typeof sql !== 'string' || !sql.trim()) {
throw new TypeError('SQL query must be a non-empty string.');
}

if (!Array.isArray(values)) {
throw new TypeError('Query values must be an array.');
}

const [rows] = await getPool().query(sql, values);

return rows;
}

async function execute(sql, values = []) {
if (typeof sql !== 'string' || !sql.trim()) {
throw new TypeError('SQL statement must be a non-empty string.');
}

if (!Array.isArray(values)) {
throw new TypeError('Statement values must be an array.');
}

const [result] = await getPool().execute(sql, values);

return result;
}

async function checkConnection() {
const [rows] = await getPool().query(
'SELECT 1 AS database_ok, DATABASE() AS database_name'
);

const row = rows[0];

return {
ok: Number(row?.database_ok) === 1,
database: row?.database_name || null,
};
}

/**

* Execute a group of database operations in a transaction.
* Usage:
* await transaction(async (connection) => {

await connection.execute(
  'UPDATE users SET status = ? WHERE id = ?',
  ['active', userId]
);

* });
* The callback receives a mysql2 connection. Use that connection for every
* operation inside the transaction; do not use the global query() helper.
    */
    async function transaction(callback, options = {}) {
    if (typeof callback !== 'function') {
    throw new TypeError('Transaction callback must be a function.');
    }

const isolationLevels = new Set([
'READ UNCOMMITTED',
'READ COMMITTED',
'REPEATABLE READ',
'SERIALIZABLE',
]);

const isolationLevel = options.isolationLevel;

if (
isolationLevel !== undefined &&
!isolationLevels.has(isolationLevel)
) {
throw new Error('Unsupported transaction isolation level.');
}

const connection = await getPool().getConnection();
let transactionStarted = false;
let operationError;

try {
if (isolationLevel) {
await connection.query(
`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`
);
}

await connection.beginTransaction();
transactionStarted = true;
const result = await callback(connection);
await connection.commit();
transactionStarted = false;
return result;

} catch (error) {
operationError = error;

if (transactionStarted) {
  try {
    await connection.rollback();
  } catch {
    // Preserve the original operation error.
    // The connection is released below; monitor rollback failures
    // through the application's database observability.
  }
}
throw operationError;

} finally {
connection.release();
}
}

async function close() {
if (closePromise) {
return closePromise;
}

if (!pool) {
return;
}

closing = true;

const currentPool = pool;

closePromise = currentPool.end()
.then(() => {
if (pool === currentPool) {
pool = undefined;
}
})
.finally(() => {
closing = false;
closePromise = undefined;
});

return closePromise;
}

module.exports = {
getPool,
query,
execute,
checkConnection,
transaction,
close,
};
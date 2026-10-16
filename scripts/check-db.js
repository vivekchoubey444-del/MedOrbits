'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  if (!process.env.DB_HOST) {
    console.log('DB_HOST not set, skipping database check');
    return;
  }
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await conn.query('SELECT 1');
  await conn.end();
  console.log('Database connection OK');
}

main().catch((err) => {
  console.error(`Database check failed: ${err.message}`);
  process.exit(1);
});

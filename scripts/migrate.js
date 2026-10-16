'use strict';

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const dir = path.join(__dirname, '..', 'db', 'migrations');

async function main() {
  if (!fs.existsSync(dir)) {
    console.log('No db/migrations directory, nothing to do');
    return;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) {
    console.log('No .sql files found, nothing to do');
    return;
  }
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  for (const file of files) {
    await conn.query(fs.readFileSync(path.join(dir, file), 'utf8'));
    console.log(`Applied ${file}`);
  }
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

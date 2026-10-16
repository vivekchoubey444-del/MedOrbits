'use strict';

const fs = require('node:fs');
const path = require('node:path');

const dir = path.resolve(process.argv[2] || 'assets/data');
if (!fs.existsSync(dir)) {
  console.log(`No data directory at ${dir}, skipping`);
  process.exit(0);
}

const errors = [];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

function findRecords(data) {
  if (Array.isArray(data)) return data;
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

for (const file of files) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  } catch (err) {
    errors.push(`${file}: ${err.message}`);
    continue;
  }
  const seen = new Set();
  for (const record of findRecords(data)) {
    if (record && typeof record === 'object' && 'id' in record) {
      if (seen.has(record.id)) {
        errors.push(`${file}: duplicate id ${record.id}`);
      }
      seen.add(record.id);
    }
  }
}

if (errors.length > 0) {
  errors.forEach((e) => console.error(e));
  process.exit(1);
}
console.log(`Validated ${files.length} data file(s) in ${dir}`);

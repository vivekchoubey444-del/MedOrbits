'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const problems = [];

const gitignorePath = path.join(root, '.gitignore');
const gitignore = fs.existsSync(gitignorePath)
  ? fs.readFileSync(gitignorePath, 'utf8')
  : '';
if (!/^\.env$/m.test(gitignore)) {
  problems.push('.gitignore must ignore .env');
}

if (fs.existsSync(path.join(root, '.env')) && process.env.CI) {
  problems.push('.env must not exist in CI checkout');
}

if (problems.length > 0) {
  problems.forEach((p) => console.error(`- ${p}`));
  process.exit(1);
}
console.log('Security check passed');

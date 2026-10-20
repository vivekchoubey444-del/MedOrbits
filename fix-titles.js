const fs = require('fs');
const path = require('path');

const re = /^(\s*(?:it|test|describe)(?:\.\w+)?\()'(.+)'(,\s*.*)$/;

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f === '.git') continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(test|spec)\.[jt]sx?$/.test(f)) fix(p);
  }
}

function fix(file) {
  let changed = 0;
  const out = fs.readFileSync(file, 'utf8').split('\n').map(line => {
    const m = line.match(re);
    if (!m || !/(^|[^\\])'/.test(m[2])) return line;
    changed++;
    const title = m[2].replace(/\\'/g, "'").replace(/"/g, '\\"');
    return `${m[1]}"${title}"${m[3]}`;
  });
  if (changed) {
    fs.writeFileSync(file, out.join('\n'));
    console.log(`${file}: ${changed} fixed`);
  }
}

walk('.');

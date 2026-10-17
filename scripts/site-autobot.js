'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WATCH_INTERVAL_MS = 10 * 60 * 1000;
const ASSET_REFERENCE = /(?:src|href|poster)\s*=\s*["'](\/assets\/[^"'?#]+)["']/gi;
const CSS_URL = /url\(\s*["']?(\/assets\/[^"')]+)["']?\s*\)/gi;

async function listFiles(directory, predicate = () => true) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(absolutePath, predicate));
    } else if (entry.isFile() && predicate(absolutePath)) {
      files.push(absolutePath);
    }
  }
  return files;
}

async function checkJson() {
  const files = [
    ...await listFiles(path.join(ROOT, 'assets/data'), (file) => file.endsWith('.json')),
    ...await listFiles(path.join(ROOT, 'assets/documents'), (file) => file.endsWith('.json')),
  ];
  const invalid = [];

  for (const file of files) {
    try {
      JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
      invalid.push(`${path.relative(ROOT, file)}: ${error.message}`);
    }
  }

  return { checked: files.length, errors: invalid };
}

async function checkLocalAssets() {
  const htmlFiles = await listFiles(ROOT, (file) => file.endsWith('.html'));
  const cssFiles = await listFiles(path.join(ROOT, 'assets/css'), (file) => file.endsWith('.css'));
  const missing = [];

  for (const file of [...htmlFiles, ...cssFiles]) {
    const content = await fs.readFile(file, 'utf8');
    const references = file.endsWith('.css')
      ? [...content.matchAll(CSS_URL)]
      : [...content.matchAll(ASSET_REFERENCE)];

    for (const [, reference] of references) {
      const target = path.resolve(ROOT, `.${reference}`);
      if (!target.startsWith(`${ROOT}${path.sep}`)) {
        missing.push(`${path.relative(ROOT, file)}: unsafe path ${reference}`);
        continue;
      }
      try {
        await fs.access(target);
      } catch {
        missing.push(`${path.relative(ROOT, file)}: missing ${reference}`);
      }
    }
  }

  return { pages: htmlFiles.length, stylesheets: cssFiles.length, errors: missing };
}

async function reportNotifications() {
  const file = path.join(ROOT, 'assets/data/notifications.json');
  let data;
  try {
    data = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    return { errors: [`assets/data/notifications.json: ${error.message}`] };
  }

  const now = Date.now();
  const records = Array.isArray(data.notifications) ? data.notifications : [];
  const live = records.filter((item) =>
    item.active === true &&
    item.publicationStatus === 'live' &&
    (!item.startsAt || Date.parse(item.startsAt) <= now) &&
    (!item.endsAt || Date.parse(item.endsAt) > now)
  ).length;
  const scheduled = records.filter((item) =>
    item.active === true &&
    item.publicationStatus === 'scheduled' &&
    item.startsAt &&
    Date.parse(item.startsAt) > now
  ).length;
  const expired = records.filter((item) =>
    item.endsAt && Date.parse(item.endsAt) <= now
  ).length;

  return { records: records.length, live, scheduled, expired, errors: [] };
}

async function runChecks() {
  const [json, assets, notifications] = await Promise.all([
    checkJson(),
    checkLocalAssets(),
    reportNotifications(),
  ]);

  console.log(`[site-autobot] JSON files checked: ${json.checked}`);
  console.log(`[site-autobot] HTML pages: ${assets.pages}; stylesheets: ${assets.stylesheets}`);
  console.log(`[site-autobot] Public notifications: ${notifications.live ?? 0} live, ${notifications.scheduled ?? 0} scheduled, ${notifications.expired ?? 0} expired (${notifications.records ?? 0} total)`);

  const errors = [...json.errors, ...assets.errors, ...notifications.errors];
  for (const error of errors) console.error(`[site-autobot] ${error}`);
  console.log(`[site-autobot] ${errors.length ? 'checks failed' : 'all checks passed'}`);
  return errors.length === 0;
}

async function main() {
  const watch = process.argv.includes('--watch');
  const passed = await runChecks();
  if (!passed) process.exitCode = 1;
  if (watch) {
    console.log('[site-autobot] Read-only checks will repeat every 10 minutes.');
    setInterval(() => {
      runChecks().then((ok) => {
        if (!ok) process.exitCode = 1;
      }).catch((error) => {
        console.error(`[site-autobot] ${error.message}`);
        process.exitCode = 1;
      });
    }, WATCH_INTERVAL_MS);
  }
}

main().catch((error) => {
  console.error(`[site-autobot] ${error.message}`);
  process.exitCode = 1;
});

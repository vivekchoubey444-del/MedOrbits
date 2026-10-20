'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const router = express.Router();

const ROOT_DIR = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'assets', 'data');
const SKIP_DIRS = new Set(['node_modules', '.git', 'tests', 'docs', 'storage', 'infrastructure']);

const DATASETS = [
  { file: 'courses.json', key: 'courses', type: 'course', url: (r) => `/education/course-details.html?slug=${encodeURIComponent(r.slug || r.id)}` },
  { file: 'universities.json', key: 'universities', type: 'university', url: () => '/education/universities.html' },
  { file: 'colleges.json', key: 'colleges', type: 'college', url: () => '/education/colleges.html' },
  { file: 'scholarships.json', key: 'scholarships', type: 'scholarship', url: () => '/education/resources/scholarships.html' },
  { file: 'services.json', key: 'services', type: 'service', url: () => '/pages/services.html' },
  { file: 'faqs.json', key: 'faqs', type: 'faq', url: () => '/education/resources/faqs.html' },
  { file: 'news.json', key: 'news', type: 'news', url: () => '/pages/notifications.html' },
  { file: 'jobs.json', key: 'jobs', type: 'job', url: () => '/career/jobs.html' },
  { file: 'internships.json', key: 'internships', type: 'internship', url: () => '/career/internships.html' },
];

let index = null;

function collectText(value, out, depth = 0) {
  if (depth > 3 || value === null || value === undefined) return;
  if (typeof value === 'string') out.push(value);
  else if (typeof value === 'number') out.push(String(value));
  else if (Array.isArray(value)) value.forEach((v) => collectText(v, out, depth + 1));
  else if (typeof value === 'object') Object.values(value).forEach((v) => collectText(v, out, depth + 1));
}

function walkHtml(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) walkHtml(path.join(dir, entry.name), files);
    } else if (entry.name.endsWith('.html')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function buildIndex() {
  const items = [];

  for (const ds of DATASETS) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(path.join(DATA_DIR, ds.file), 'utf8'));
    } catch (_) {
      continue;
    }
    const records = Array.isArray(json[ds.key]) ? json[ds.key] : [];
    for (const r of records) {
      if (!r || typeof r !== 'object' || r.active === false) continue;
      const title = r.name || r.title || r.question || '';
      if (!title) continue;
      const parts = [];
      collectText({ name: r.name, shortName: r.shortName, aliases: r.aliases, tags: r.tags, summary: r.summary,
        description: r.description, shortDescription: r.shortDescription, category: r.category, discipline: r.discipline,
        level: r.level, stateName: r.stateName, answer: r.answer }, parts);
      items.push({
        id: r.id || null,
        type: ds.type,
        title: String(title),
        summary: String(r.shortDescription || r.summary || r.description || r.answer || '').slice(0, 240),
        url: ds.url(r),
        haystack: parts.join(' ').toLowerCase(),
        titleLower: String(title).toLowerCase(),
      });
    }
  }

  for (const file of walkHtml(ROOT_DIR)) {
    let html;
    try {
      html = fs.readFileSync(file, 'utf8');
    } catch (_) {
      continue;
    }
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
    if (!title) continue;
    const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '';
    const rel = '/' + path.relative(ROOT_DIR, file).split(path.sep).join('/');
    if (/\/(400|404|500|offline|maintenance)\.html$/.test(rel)) continue;
    items.push({
      id: rel,
      type: 'page',
      title: title.trim(),
      summary: desc.slice(0, 240),
      url: rel,
      haystack: `${title} ${desc} ${rel}`.toLowerCase(),
      titleLower: title.toLowerCase(),
    });
  }

  return items;
}

function score(item, terms, phrase) {
  let s = 0;
  for (const t of terms) {
    if (!item.haystack.includes(t)) return 0;
    s += item.titleLower.includes(t) ? 3 : 1;
  }
  if (item.titleLower.includes(phrase)) s += 5;
  return s;
}

router.get('/', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const type = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : '';
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

  if (q.length < 2 || q.length > 100) {
    return res.status(400).json({
      success: false,
      error: { code: 'SEARCH_QUERY_INVALID', message: 'Provide a search query of 2 to 100 characters using q.' },
    });
  }

  if (!index) index = buildIndex();

  const terms = q.split(/\s+/).filter(Boolean).slice(0, 8);
  const matches = index
    .filter((i) => !type || i.type === type)
    .map((i) => ({ i, s: score(i, terms, q) }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s || a.i.title.localeCompare(b.i.title));

  const items = matches.slice(0, limit).map(({ i }) => ({
    id: i.id, type: i.type, title: i.title, summary: i.summary, url: i.url,
  }));

  return res.json({ success: true, data: items, query: q, total: matches.length });
});

module.exports = router;

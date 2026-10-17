'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Parser = require('rss-parser');

const ROOT = path.join(__dirname, '..');
const DEFAULT_DATA_DIR = path.join(ROOT, 'assets', 'data');
const MAX_FEED_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;
const parser = new Parser({ timeout: FETCH_TIMEOUT_MS });

function isAllowedHttpsUrl(value, allowedHost) {
  try {
    const url = new URL(value);
    const host = allowedHost.toLowerCase();
    return url.protocol === 'https:'
      && (url.hostname.toLowerCase() === host
        || url.hostname.toLowerCase().endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function matchesSourceKeywords(title, keywords) {
  const normalizedTitle = title.toLocaleLowerCase();
  return keywords.some((keyword) => normalizedTitle.includes(keyword.toLocaleLowerCase()));
}

function getCategory(title) {
  if (/exam|परीक्षा|neet|नीट|cuet|सीयूईटी|nta|एनटीए/i.test(title)) return 'exams';
  if (/scholarship|छात्रवृत्ति/i.test(title)) return 'scholarships';
  if (/admission|प्रवेश/i.test(title)) return 'admissions';
  if (/recruitment|employment|भर्ती|नियुक्ति|रोजगार/i.test(title)) return 'jobs';
  if (/university|college|ugc|विश्वविद्यालय|महाविद्यालय|यूजीसी/i.test(title)) return 'institutions';
  return 'general';
}

function createReleaseCandidate(item, source, createdAt) {
  const title = typeof item.title === 'string' ? item.title.trim().slice(0, 160) : '';
  const link = typeof item.link === 'string' ? item.link.trim() : '';
  if (!title || !isAllowedHttpsUrl(link, source.allowedHost)) return null;
  if (!matchesSourceKeywords(title, source.keywords)) return null;

  const idHash = crypto.createHash('sha256').update(`${source.id}\0${link}`).digest('hex').slice(0, 20);
  const itemDate = item.isoDate || item.pubDate;
  const publishedAt = itemDate && Number.isFinite(Date.parse(itemDate))
    ? new Date(itemDate).toISOString()
    : null;

  return {
    id: `news-release-${idHash}`,
    title,
    slug: `release-${idHash}`,
    summary: `A new official release was detected from ${source.name}. Review the original source before acting.`,
    body: null,
    category: getCategory(title),
    tags: ['official-feed', source.id],
    newsType: 'announcement',
    priority: 'normal',
    countryCode: 'IN',
    stateIds: [],
    examIds: [],
    courseIds: [],
    institutionIds: [],
    admissionIds: [],
    impact: 'general',
    actionRequired: null,
    effectiveFrom: null,
    deadlineDate: null,
    source: {
      name: source.name,
      sourceType: source.sourceType,
      url: link,
    },
    officialNoticeUrl: link,
    sourceUrl: link,
    noticeNumber: null,
    noticeDate: publishedAt ? publishedAt.slice(0, 10) : null,
    language: source.language || 'en',
    image: null,
    relatedNewsIds: [],
    supersedesId: null,
    isBreaking: false,
    isPinned: false,
    publicationStatus: 'draft',
    publishedAt: null,
    expiresAt: null,
    author: 'release-feed-worker',
    reviewedBy: null,
    verificationStatus: 'pending_review',
    verifiedAt: null,
    verifiedBy: null,
    reviewDueAt: null,
    active: false,
    createdAt,
    updatedAt: createdAt,
  };
}

async function fetchFeed(source, fetchImpl) {
  if (!isAllowedHttpsUrl(source.feedUrl, source.allowedHost)) {
    throw new Error(`Feed URL is outside the allowed HTTPS host for ${source.id}.`);
  }

  const response = await fetchImpl(source.feedUrl, {
    headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${source.id} returned HTTP ${response.status}.`);

  const contentType = response.headers.get('content-type') || '';
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_FEED_BYTES) throw new Error(`${source.id} exceeded the feed size limit.`);

  const xml = bytes.toString('utf8');
  if (!/xml|rss|atom/i.test(contentType) && !/^\s*(?:<\?xml|<rss\b|<feed\b)/i.test(xml)) {
    throw new Error(`${source.id} did not return an RSS or Atom document.`);
  }
  return parser.parseString(xml);
}

function atomicWriteJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
  fs.renameSync(temporary, file);
}

async function syncOfficialReleases({
  dataDir = DEFAULT_DATA_DIR,
  fetchImpl = fetch,
  asOf = new Date(),
  dryRun = false,
} = {}) {
  if (!(asOf instanceof Date) || Number.isNaN(asOf.getTime())) {
    throw new TypeError('asOf must be a valid Date.');
  }

  const sourcesPath = path.join(dataDir, 'release-sources.json');
  const newsPath = path.join(dataDir, 'news.json');
  const sourceData = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  const dataset = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
  if (!Array.isArray(sourceData.sources) || !Array.isArray(dataset.news)) {
    throw new TypeError('Release source configuration and news dataset must contain arrays.');
  }

  const sources = sourceData.sources.filter((source) => source.enabled === true);
  if (!sources.length) throw new Error('No official release feeds are enabled.');

  const existingIds = new Set(dataset.news.map((item) => item.id));
  const createdAt = asOf.toISOString();
  const added = [];
  const errors = [];
  let successfulFeeds = 0;

  for (const source of sources) {
    try {
      const feed = await fetchFeed(source, fetchImpl);
      successfulFeeds += 1;
      for (const item of feed.items || []) {
        const candidate = createReleaseCandidate(item, source, createdAt);
        if (candidate && !existingIds.has(candidate.id)) {
          existingIds.add(candidate.id);
          added.push(candidate);
        }
      }
    } catch (error) {
      errors.push({ source: source.id, message: error.message });
    }
  }

  if (successfulFeeds === 0) {
    throw new Error(`Every configured release feed failed: ${errors.map((item) => item.source).join(', ')}.`);
  }

  if (!dryRun && added.length) {
    dataset.news.push(...added);
    dataset.updatedAt = createdAt;
    atomicWriteJson(newsPath, dataset);
  }

  return {
    feedsChecked: successfulFeeds,
    candidatesAdded: added.length,
    errors,
    dryRun,
  };
}

if (require.main === module) {
  syncOfficialReleases({ dryRun: process.argv.includes('--dry-run') })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  createReleaseCandidate,
  isAllowedHttpsUrl,
  matchesSourceKeywords,
  syncOfficialReleases,
};
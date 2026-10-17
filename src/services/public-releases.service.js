'use strict';

const APPROVED_STATUSES = new Set(['verified', 'content_reviewed']);
const NOTICE_TYPES = new Set([
  'official_notice',
  'announcement',
  'deadline_update',
  'schedule_change',
  'result_declared',
  'policy_change',
  'correction',
]);

function isNotExpired(item, asOf) {
  if (!item.expiresAt) return true;
  const expiry = Date.parse(item.expiresAt);
  return Number.isFinite(expiry) && expiry >= asOf.getTime();
}

function hasPublicSource(item) {
  const sourceUrl = item.officialNoticeUrl || item.sourceUrl || item.source?.url;
  if (typeof sourceUrl !== 'string') return false;

  try {
    return new URL(sourceUrl).protocol === 'https:';
  } catch {
    return false;
  }
}

function isPublishable(item, asOf) {
  return Boolean(
    item &&
      typeof item === 'object' &&
      item.active !== false &&
      item.publicationStatus === 'published' &&
      APPROVED_STATUSES.has(item.verificationStatus) &&
      hasPublicSource(item) &&
      isNotExpired(item, asOf),
  );
}

function sortNewestFirst(left, right) {
  return Date.parse(right.publishedAt || right.createdAt || 0)
    - Date.parse(left.publishedAt || left.createdAt || 0);
}

function listPublicReleases({ news = [], bulletins = [], asOf = new Date() } = {}) {
  if (!Array.isArray(news) || !Array.isArray(bulletins)) {
    throw new TypeError('news and bulletins must be arrays.');
  }
  if (!(asOf instanceof Date) || Number.isNaN(asOf.getTime())) {
    throw new TypeError('asOf must be a valid Date.');
  }

  return {
    notices: news
      .filter((item) => NOTICE_TYPES.has(item.newsType) && isPublishable(item, asOf))
      .sort(sortNewestFirst),
    bulletins: bulletins
      .filter((item) => isPublishable(item, asOf))
      .sort(sortNewestFirst),
  };
}

module.exports = { listPublicReleases };
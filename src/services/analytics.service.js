'use strict';
const { requireDependency, requiredString, safePage } = require('./service-utils');
function createAnalyticsService({ analyticsRepository, clock = () => new Date() }) {
  requireDependency(analyticsRepository, 'analyticsRepository');
  return {
    async track(event) {
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw new TypeError('event must be an object.');
      const name = requiredString(event.name, 'event.name', { max: 100 });
      const safe = { name, actorId: event.actorId || null, anonymousId: event.anonymousId || null, occurredAt: event.occurredAt ? new Date(event.occurredAt) : clock(), properties: sanitizeProperties(event.properties || {}) };
      return analyticsRepository.create(safe);
    },
    async report(query = {}) {
      const { page, limit, offset } = safePage(query);
      if (typeof analyticsRepository.report !== 'function') throw new TypeError('analyticsRepository must implement report().');
      return analyticsRepository.report({ from: query.from ? new Date(query.from) : undefined, to: query.to ? new Date(query.to) : undefined, eventName: query.eventName ? requiredString(query.eventName, 'eventName', { max: 100 }) : undefined, page, limit, offset });
    },
  };
}
function sanitizeProperties(value) { const result = {}; for (const [key, val] of Object.entries(value).slice(0, 50)) { if (/password|token|secret|email|phone|address|document|payment|authorization/i.test(key)) continue; if (['string','number','boolean'].includes(typeof val) || val === null) result[key.slice(0, 80)] = typeof val === 'string' ? val.slice(0, 500) : val; } return result; }
module.exports = { createAnalyticsService, sanitizeProperties };

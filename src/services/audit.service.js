'use strict';
const { requireDependency, requiredString, requiredId } = require('./service-utils');
const REDACT = /password|token|secret|authorization|cookie|paymentMethod|cardNumber|cvv|documentContent/i;
function createAuditService({ auditRepository, clock = () => new Date() }) {
  requireDependency(auditRepository, 'auditRepository');
  return {
    async record(event) {
      if (!event || typeof event !== 'object') throw new TypeError('Audit event is required.');
      const action = requiredString(event.action, 'action', { max: 160 });
      const entry = { action, entity: event.entity ? String(event.entity).slice(0, 100) : null, entityId: event.entityId == null ? null : String(event.entityId).slice(0, 128), actorId: event.actorId == null ? null : String(event.actorId).slice(0, 128), requestId: event.requestId ? String(event.requestId).slice(0, 128) : null, ipAddress: event.ipAddress ? String(event.ipAddress).slice(0, 64) : null, metadata: redact(event.metadata || {}), createdAt: clock() };
      return auditRepository.create(entry);
    },
    log(event) { return this.record(event); },
    async list(query = {}) { if (typeof auditRepository.list !== 'function') throw new TypeError('auditRepository must implement list().'); const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 50)); return auditRepository.list({ actorId: query.actorId, entity: query.entity, action: query.action, from: query.from, to: query.to, limit, cursor: query.cursor }); },
  };
}
function redact(value, depth = 0) { if (depth > 4 || value == null || typeof value !== 'object') return typeof value === 'string' ? value.slice(0, 500) : value; if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1)); const out = {}; for (const [key, item] of Object.entries(value).slice(0, 50)) { if (REDACT.test(key)) continue; out[key.slice(0, 100)] = redact(item, depth + 1); } return out; }
module.exports = { createAuditService, redact };

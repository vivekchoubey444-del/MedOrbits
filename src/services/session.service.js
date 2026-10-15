'use strict';
const { ServiceError, requireDependency, requiredId, assertFound, audit } = require('./service-utils');
function createSessionService({ sessionRepository, auditService, ttlSeconds = 86400 }) {
  requireDependency(sessionRepository, 'sessionRepository');
  return {
    async create(userId, context = {}) {
      requiredId(userId, 'userId');
      const expiresAt = new Date(Date.now() + Math.max(60, Number(ttlSeconds)) * 1000);
      const session = await sessionRepository.create({ userId, expiresAt, ipAddress: context.ip, userAgent: context.userAgent, revokedAt: null });
      return session;
    },
    async getActive(sessionId, userId) {
      const session = assertFound(await sessionRepository.findById(sessionId), 'Session');
      if (String(session.userId) !== String(userId) || session.revokedAt || new Date(session.expiresAt) <= new Date()) throw new ServiceError('Session is invalid or expired.', { code: 'SESSION_INVALID', status: 401 });
      return session;
    },
    async revoke(sessionId, userId) {
      requiredId(sessionId, 'sessionId');
      const session = await sessionRepository.findById(sessionId);
      if (!session) return { revoked: true };
      if (userId && String(session.userId) !== String(userId)) throw new ServiceError('Session not found.', { code: 'NOT_FOUND', status: 404 });
      await sessionRepository.updateById(sessionId, { revokedAt: new Date() });
      await audit(auditService, { action: 'session.revoked', entity: 'Session', entityId: sessionId, actorId: userId });
      return { revoked: true };
    },
    async revokeAllForUser(userId) {
      requiredId(userId, 'userId');
      if (typeof sessionRepository.revokeAllForUser !== 'function') throw new ServiceError('Bulk session revocation is not configured.', { status: 501 });
      return sessionRepository.revokeAllForUser(userId, new Date());
    },
  };
}
module.exports = { createSessionService };

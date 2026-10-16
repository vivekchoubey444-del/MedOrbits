
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredId,
  assertFound,
  audit,
} = require('./service-utils');

const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 30 * 24 * 60 * 60;

function createSessionService({
  sessionRepository,
  auditService,
  ttlSeconds = 86400,
}) {
  requireDependency(sessionRepository, 'sessionRepository');

  if (
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds < MIN_TTL_SECONDS ||
    ttlSeconds > MAX_TTL_SECONDS
  ) {
    throw new TypeError(
      `ttlSeconds must be an integer between ${MIN_TTL_SECONDS} and ${MAX_TTL_SECONDS}.`,
    );
  }

  function isExpired(session, now = new Date()) {
    const expiry = new Date(session.expiresAt);

    return (
      !session.expiresAt ||
      Number.isNaN(expiry.getTime()) ||
      expiry <= now
    );
  }

  function invalidSessionError() {
    return new ServiceError('Session is invalid or expired.', {
      code: 'SESSION_INVALID',
      status: 401,
    });
  }

  return {
    async create(userId, context = {}) {
      requiredId(userId, 'userId');

      const expiresAt = new Date(
        Date.now() + ttlSeconds * 1000,
      );

      const session = await sessionRepository.create({
        userId,
        expiresAt,
        ipAddress:
          typeof context.ip === 'string' ? context.ip : null,
        userAgent:
          typeof context.userAgent === 'string'
            ? context.userAgent.slice(0, 1024)
            : null,
        revokedAt: null,
      });

      // Return the persisted session only to trusted internal callers.
      // Never expose session secrets through public API responses.
      return session;
    },

    async getActive(sessionId, userId) {
      requiredId(sessionId, 'sessionId');
      requiredId(userId, 'userId');

      const session = assertFound(
        await sessionRepository.findById(sessionId),
        'Session',
      );

      if (
        String(session.userId) !== String(userId) ||
        session.revokedAt ||
        isExpired(session)
      ) {
        throw invalidSessionError();
      }

      return session;
    },

    async revoke(sessionId, userId) {
      requiredId(sessionId, 'sessionId');

      if (userId !== undefined && userId !== null) {
        requiredId(userId, 'userId');
      }

      const session = await sessionRepository.findById(sessionId);

      // Idempotent response: do not disclose whether a session exists.
      if (!session) {
        return { revoked: true };
      }

      if (
        userId !== undefined &&
        userId !== null &&
        String(session.userId) !== String(userId)
      ) {
        throw new ServiceError('Session not found.', {
          code: 'NOT_FOUND',
          status: 404,
        });
      }

      if (session.revokedAt) {
        return { revoked: true };
      }

      const revokedAt = new Date();

      assertFound(
        await sessionRepository.updateById(sessionId, {
          revokedAt,
        }),
        'Session',
      );

      await audit(auditService, {
        action: 'session.revoked',
        entity: 'Session',
        entityId: sessionId,
        actorId: userId ?? session.userId,
      });

      return { revoked: true };
    },

    async revokeAllForUser(userId) {
      requiredId(userId, 'userId');

      if (
        typeof sessionRepository.revokeAllForUser !== 'function'
      ) {
        throw new ServiceError(
          'Bulk session revocation is not configured.',
          {
            code: 'SESSION_REPOSITORY_MISCONFIGURED',
            status: 501,
          },
        );
      }

      const result = await sessionRepository.revokeAllForUser(
        userId,
        new Date(),
      );

      await audit(auditService, {
        action: 'session.all_revoked',
        entity: 'User',
        entityId: userId,
        actorId: userId,
      });

      return result;
    },
  };
}

module.exports = { createSessionService };

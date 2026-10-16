
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredId,
  assertFound,
  createCrudService,
  audit,
} = require('./service-utils');

const ALLOWED_STATUSES = new Set([
  'requested',
  'scheduled',
  'completed',
  'cancelled',
]);

const TERMINAL_STATUSES = new Set([
  'completed',
  'cancelled',
]);

function createCounsellingService({
  counsellingRepository,
  auditService,
}) {
  requireDependency(
    counsellingRepository,
    'counsellingRepository'
  );

  const crud = createCrudService({
    repository: counsellingRepository,
    entity: 'Counselling',
    auditService,
    allowedSort: [
      'createdAt',
      'updatedAt',
      'status',
      'scheduledAt',
    ],
  });

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      requiredId(id, 'counsellingId');

      if (
        typeof status !== 'string' ||
        !ALLOWED_STATUSES.has(status)
      ) {
        throw new ServiceError(
          'Unsupported counselling status.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
            details: {
              allowed: [...ALLOWED_STATUSES],
            },
          }
        );
      }

      const findById =
        counsellingRepository.findById ||
        counsellingRepository.getById;

      if (typeof findById !== 'function') {
        throw new TypeError(
          'Counselling repository must implement findById() or getById().'
        );
      }

      if (
        typeof counsellingRepository.updateById !== 'function'
      ) {
        throw new TypeError(
          'Counselling repository must implement updateById().'
        );
      }

      const existing = assertFound(
        await findById.call(counsellingRepository, id),
        'Counselling'
      );

      if (
        TERMINAL_STATUSES.has(existing.status) &&
        existing.status !== status
      ) {
        throw new ServiceError(
          'A completed or cancelled counselling request cannot be reopened or changed.',
          {
            code: 'INVALID_STATUS_TRANSITION',
            status: 409,
          }
        );
      }

      const changes = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'scheduled' && !existing.scheduledAt) {
        changes.scheduledAt = new Date();
      }

      if (status === 'completed') {
        changes.completedAt =
          existing.completedAt || new Date();
      }

      if (status === 'cancelled') {
        changes.cancelledAt =
          existing.cancelledAt || new Date();
      }

      const record = assertFound(
        await counsellingRepository.updateById(id, changes),
        'Counselling'
      );

      await audit(auditService, {
        action: 'counselling.status_changed',
        entity: 'Counselling',
        entityId: id,
        actorId: actor.id,
        metadata: {
          previousStatus: existing.status,
          status,
        },
      });

      return record;
    },
  };
}

module.exports = {
  createCounsellingService,
};


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
  'draft',
  'open',
  'closed',
  'cancelled',
]);

const TERMINAL_STATUSES = new Set([
  'cancelled',
]);

function createAdmissionService({
  admissionRepository,
  auditService,
}) {
  requireDependency(admissionRepository, 'admissionRepository');

  const crud = createCrudService({
    repository: admissionRepository,
    entity: 'Admission',
    auditService,
    allowedSort: [
      'createdAt',
      'updatedAt',
      'name',
      'title',
      'status',
      'startDate',
      'endDate',
    ],
  });

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      requiredId(id, 'admissionId');

      if (
        typeof status !== 'string' ||
        !ALLOWED_STATUSES.has(status)
      ) {
        throw new ServiceError(
          'Unsupported admission status.',
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
        admissionRepository.findById ||
        admissionRepository.getById;

      if (typeof findById !== 'function') {
        throw new TypeError(
          'Admission repository must implement findById() or getById().'
        );
      }

      if (typeof admissionRepository.updateById !== 'function') {
        throw new TypeError(
          'Admission repository must implement updateById().'
        );
      }

      const existing = assertFound(
        await findById.call(admissionRepository, id),
        'Admission'
      );

      if (
        TERMINAL_STATUSES.has(existing.status) &&
        existing.status !== status
      ) {
        throw new ServiceError(
          'A cancelled admission cannot be reopened.',
          {
            code: 'INVALID_STATE',
            status: 409,
          }
        );
      }

      if (existing.status === status) {
        return existing;
      }

      const changes = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'open' && existing.status !== 'open') {
        changes.openedAt = new Date();
      }

      if (status === 'closed') {
        changes.closedAt = new Date();
      }

      if (status === 'cancelled') {
        changes.cancelledAt = new Date();
      }

      const record = assertFound(
        await admissionRepository.updateById(id, changes),
        'Admission'
      );

      await audit(auditService, {
        action: 'admission.status_changed',
        entity: 'Admission',
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
  createAdmissionService,
};

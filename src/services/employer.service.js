
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
  'pending',
  'verified',
  'suspended',
]);

function createEmployerService({
  employerRepository,
  auditService,
}) {
  requireDependency(employerRepository, 'employerRepository');

  const crud = createCrudService({
    repository: employerRepository,
    entity: 'Employer',
    auditService,
  });

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      requiredId(id);

      if (!ALLOWED_STATUSES.has(status)) {
        throw new ServiceError(
          'Unsupported employer status.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
            details: {
              allowed: [...ALLOWED_STATUSES],
            },
          },
        );
      }

      if (typeof employerRepository.updateById !== 'function') {
        throw new TypeError(
          'Employer repository must implement updateById().',
        );
      }

      const record = assertFound(
        await employerRepository.updateById(id, { status }),
        'Employer',
      );

      await audit(auditService, {
        action: 'employer.status_changed',
        entity: 'Employer',
        entityId: record.id ?? id,
        actorId: actor.id,
        metadata: { status },
      });

      return record;
    },
  };
}

module.exports = { createEmployerService };

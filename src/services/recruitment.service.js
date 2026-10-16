
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
  'in_progress',
  'fulfilled',
  'cancelled',
]);

function createRecruitmentService({
  recruitmentRepository,
  auditService,
}) {
  requireDependency(recruitmentRepository, 'recruitmentRepository');

  const crud = createCrudService({
    repository: recruitmentRepository,
    entity: 'Recruitment',
    auditService,
  });

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      requiredId(id);

      if (!ALLOWED_STATUSES.has(status)) {
        throw new ServiceError(
          'Unsupported recruitment status.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
            details: {
              allowed: [...ALLOWED_STATUSES],
            },
          },
        );
      }

      if (typeof recruitmentRepository.updateById !== 'function') {
        throw new TypeError(
          'Recruitment repository must implement updateById().',
        );
      }

      const record = assertFound(
        await recruitmentRepository.updateById(id, { status }),
        'Recruitment',
      );

      await audit(auditService, {
        action: 'recruitment.status_changed',
        entity: 'Recruitment',
        entityId: record.id ?? id,
        actorId: actor.id,
        metadata: { status },
      });

      return record;
    },
  };
}

module.exports = { createRecruitmentService };

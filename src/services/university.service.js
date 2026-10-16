
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
  'published',
  'archived',
]);

function createUniversityService({
  universityRepository,
  auditService,
}) {
  requireDependency(universityRepository, 'universityRepository');

  const crud = createCrudService({
    repository: universityRepository,
    entity: 'University',
    auditService,
  });

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      requiredId(id);

      if (!ALLOWED_STATUSES.has(status)) {
        throw new ServiceError(
          'Unsupported university status.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          },
        );
      }

      const record = assertFound(
        await universityRepository.updateById(id, { status }),
        'University',
      );

      await audit(auditService, {
        action: 'university.status_changed',
        entity: 'University',
        entityId: record.id ?? id,
        actorId: actor.id,
        metadata: { status },
      });

      return record;
    },
  };
}

module.exports = { createUniversityService };

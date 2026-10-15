'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createUniversityService({ universityRepository, auditService }) {
  requireDependency(universityRepository, 'universityRepository');
  const crud = createCrudService({ repository: universityRepository, entity: 'University', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['draft', 'published', 'archived'].includes(status)) throw new ServiceError('Unsupported university status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await universityRepository.updateById(id, { status }), 'University');
      await audit(auditService, { action: 'university.status_changed', entity: 'University', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
  };
}
module.exports = { createUniversityService };

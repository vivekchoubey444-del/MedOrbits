'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createCollegeService({ collegeRepository, auditService }) {
  requireDependency(collegeRepository, 'collegeRepository');
  const crud = createCrudService({ repository: collegeRepository, entity: 'College', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['draft', 'published', 'archived'].includes(status)) throw new ServiceError('Unsupported college status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await collegeRepository.updateById(id, { status }), 'College');
      await audit(auditService, { action: 'college.status_changed', entity: 'College', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
  };
}
module.exports = { createCollegeService };

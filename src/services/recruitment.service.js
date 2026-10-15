'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createRecruitmentService({ recruitmentRepository, auditService }) {
  requireDependency(recruitmentRepository, 'recruitmentRepository');
  const crud = createCrudService({ repository: recruitmentRepository, entity: 'Recruitment', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['requested', 'in_progress', 'fulfilled', 'cancelled'].includes(status)) throw new ServiceError('Unsupported recruitment status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await recruitmentRepository.updateById(id, { status }), 'Recruitment');
      await audit(auditService, { action: 'recruitment.status_changed', entity: 'Recruitment', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
  };
}
module.exports = { createRecruitmentService };

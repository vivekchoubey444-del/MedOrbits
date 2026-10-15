'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createCounsellingService({ counsellingRepository, auditService }) {
  requireDependency(counsellingRepository, 'counsellingRepository');
  const crud = createCrudService({ repository: counsellingRepository, entity: 'Counselling', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['requested', 'scheduled', 'completed', 'cancelled'].includes(status)) throw new ServiceError('Unsupported counselling status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await counsellingRepository.updateById(id, { status }), 'Counselling');
      await audit(auditService, { action: 'counselling.status_changed', entity: 'Counselling', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
  };
}
module.exports = { createCounsellingService };

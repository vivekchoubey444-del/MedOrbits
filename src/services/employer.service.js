'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createEmployerService({ employerRepository, auditService }) {
  requireDependency(employerRepository, 'employerRepository');
  const crud = createCrudService({ repository: employerRepository, entity: 'Employer', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['pending', 'verified', 'suspended'].includes(status)) throw new ServiceError('Unsupported employer status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await employerRepository.updateById(id, { status }), 'Employer');
      await audit(auditService, { action: 'employer.status_changed', entity: 'Employer', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
  };
}
module.exports = { createEmployerService };

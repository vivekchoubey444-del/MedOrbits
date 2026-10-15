'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createCandidateService({ candidateRepository, auditService }) {
  requireDependency(candidateRepository, 'candidateRepository');
  const crud = createCrudService({ repository: candidateRepository, entity: 'Candidate', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['active', 'inactive', 'blocked'].includes(status)) throw new ServiceError('Unsupported candidate status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await candidateRepository.updateById(id, { status }), 'Candidate');
      await audit(auditService, { action: 'candidate.status_changed', entity: 'Candidate', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
  };
}
module.exports = { createCandidateService };

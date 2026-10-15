'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createInternshipService({ internshipRepository, auditService }) {
  requireDependency(internshipRepository, 'internshipRepository');
  const crud = createCrudService({ repository: internshipRepository, entity: 'Internship', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['draft', 'published', 'paused', 'closed', 'filled'].includes(status)) throw new ServiceError('Unsupported internship status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await internshipRepository.updateById(id, { status }), 'Internship');
      await audit(auditService, { action: 'internship.status_changed', entity: 'Internship', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
    async publish(id, actor = {}) { const record = assertFound(await internshipRepository.updateById(id, { status: 'published', publishedAt: new Date() }), 'Internship'); await audit(auditService, { action: 'internship.published', entity: 'Internship', entityId: id, actorId: actor.id }); return record; },
  };
}
module.exports = { createInternshipService };

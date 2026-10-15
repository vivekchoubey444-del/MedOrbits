'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createJobService({ jobRepository, auditService }) {
  requireDependency(jobRepository, 'jobRepository');
  const crud = createCrudService({ repository: jobRepository, entity: 'Job', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['draft', 'published', 'paused', 'closed', 'filled'].includes(status)) throw new ServiceError('Unsupported job status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await jobRepository.updateById(id, { status }), 'Job');
      await audit(auditService, { action: 'job.status_changed', entity: 'Job', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
    async publish(id, actor = {}) { const record = assertFound(await jobRepository.updateById(id, { status: 'published', publishedAt: new Date() }), 'Job'); await audit(auditService, { action: 'job.published', entity: 'Job', entityId: id, actorId: actor.id }); return record; },
  };
}
module.exports = { createJobService };

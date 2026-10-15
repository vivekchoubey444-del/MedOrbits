'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createApplicationService({ applicationRepository, auditService }) {
  requireDependency(applicationRepository, 'applicationRepository');
  const crud = createCrudService({ repository: applicationRepository, entity: 'Application', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'].includes(status)) throw new ServiceError('Unsupported application status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await applicationRepository.updateById(id, { status }), 'Application');
      await audit(auditService, { action: 'application.status_changed', entity: 'Application', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
    async submit(id, actor = {}) { const record = assertFound(await applicationRepository.findById(id), 'Application'); if (String(record.applicantId) !== String(actor.id) && !actor.isAdmin) throw new ServiceError('You cannot submit this application.', { code: 'FORBIDDEN', status: 403 }); if (record.status !== 'draft') throw new ServiceError('Only draft applications can be submitted.', { code: 'INVALID_STATE', status: 409 }); return assertFound(await applicationRepository.updateById(id, { status: 'submitted', submittedAt: new Date() }), 'Application'); },
  };
}
module.exports = { createApplicationService };

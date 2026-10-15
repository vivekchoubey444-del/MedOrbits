'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createAdmissionService({ admissionRepository, auditService }) {
  requireDependency(admissionRepository, 'admissionRepository');
  const crud = createCrudService({ repository: admissionRepository, entity: 'Admission', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['draft', 'open', 'closed', 'cancelled'].includes(status)) throw new ServiceError('Unsupported admission status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await admissionRepository.updateById(id, { status }), 'Admission');
      await audit(auditService, { action: 'admission.status_changed', entity: 'Admission', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
  };
}
module.exports = { createAdmissionService };

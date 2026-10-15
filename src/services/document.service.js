'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createDocumentService({ documentRepository, auditService }) {
  requireDependency(documentRepository, 'documentRepository');
  const crud = createCrudService({ repository: documentRepository, entity: 'Document', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['pending', 'verified', 'rejected', 'expired'].includes(status)) throw new ServiceError('Unsupported document status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await documentRepository.updateById(id, { status }), 'Document');
      await audit(auditService, { action: 'document.status_changed', entity: 'Document', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
    async review(id, decision, reviewer = {}) { if (!['verified', 'rejected'].includes(decision)) throw new ServiceError('Decision must be verified or rejected.', { code: 'VALIDATION_ERROR', status: 422 }); const record = assertFound(await documentRepository.updateById(id, { status: decision, reviewedBy: reviewer.id, reviewedAt: new Date() }), 'Document'); await audit(auditService, { action: `document.${decision}`, entity: 'Document', entityId: id, actorId: reviewer.id }); return record; },
  };
}
module.exports = { createDocumentService };

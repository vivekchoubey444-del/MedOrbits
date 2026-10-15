'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, plainObject, assertFound, createCrudService, audit } = require('./service-utils');

function createCourseService({ courseRepository, auditService }) {
  requireDependency(courseRepository, 'courseRepository');
  const crud = createCrudService({ repository: courseRepository, entity: 'Course', auditService });
  return { ...crud,
    async setStatus(id, status, actor = {}) {
      requiredId(id);
      if (!['draft', 'published', 'archived'].includes(status)) throw new ServiceError('Unsupported course status.', { code: 'VALIDATION_ERROR', status: 422 });
      const record = assertFound(await courseRepository.updateById(id, { status }), 'Course');
      await audit(auditService, { action: 'course.status_changed', entity: 'Course', entityId: id, actorId: actor.id, metadata: { status } });
      return record;
    },
  };
}
module.exports = { createCourseService };

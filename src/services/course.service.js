
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredId,
  assertFound,
  createCrudService,
  audit,
} = require('./service-utils');

const ALLOWED_STATUSES = new Set([
  'draft',
  'published',
  'archived',
]);

function createCourseService({ courseRepository, auditService }) {
  requireDependency(courseRepository, 'courseRepository');

  const crud = createCrudService({
    repository: courseRepository,
    entity: 'Course',
    auditService,
    allowedSort: [
      'createdAt',
      'updatedAt',
      'name',
      'title',
      'status',
      'slug',
    ],
  });

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      requiredId(id, 'courseId');

      if (
        typeof status !== 'string' ||
        !ALLOWED_STATUSES.has(status)
      ) {
        throw new ServiceError('Unsupported course status.', {
          code: 'VALIDATION_ERROR',
          status: 422,
          details: {
            allowed: [...ALLOWED_STATUSES],
          },
        });
      }

      if (typeof courseRepository.updateById !== 'function') {
        throw new TypeError(
          'Course repository must implement updateById().'
        );
      }

      const existing = courseRepository.findById
        ? await courseRepository.findById(id)
        : courseRepository.getById
          ? await courseRepository.getById(id)
          : null;

      assertFound(existing, 'Course');

      const changes = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'published') {
        changes.publishedAt =
          existing.publishedAt || new Date();
      }

      if (status === 'draft') {
        changes.publishedAt = null;
      }

      const record = assertFound(
        await courseRepository.updateById(id, changes),
        'Course'
      );

      await audit(auditService, {
        action: 'course.status_changed',
        entity: 'Course',
        entityId: id,
        actorId: actor.id,
        metadata: {
          previousStatus: existing.status,
          status,
        },
      });

      return record;
    },
  };
}

module.exports = {
  createCourseService,
};


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

function createCollegeService({
  collegeRepository,
  auditService,
}) {
  requireDependency(collegeRepository, 'collegeRepository');

  const crud = createCrudService({
    repository: collegeRepository,
    entity: 'College',
    auditService,
    allowedSort: [
      'createdAt',
      'updatedAt',
      'name',
      'status',
      'country',
      'state',
      'city',
    ],
  });

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      requiredId(id, 'collegeId');

      if (
        typeof status !== 'string' ||
        !ALLOWED_STATUSES.has(status)
      ) {
        throw new ServiceError(
          'Unsupported college status.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
            details: {
              allowed: [...ALLOWED_STATUSES],
            },
          }
        );
      }

      const findById =
        collegeRepository.findById ||
        collegeRepository.getById;

      if (typeof findById !== 'function') {
        throw new TypeError(
          'College repository must implement findById() or getById().'
        );
      }

      if (typeof collegeRepository.updateById !== 'function') {
        throw new TypeError(
          'College repository must implement updateById().'
        );
      }

      const existing = assertFound(
        await findById.call(collegeRepository, id),
        'College'
      );

      const changes = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'published') {
        changes.publishedAt =
          existing.publishedAt || new Date();
      } else if (status === 'draft') {
        changes.publishedAt = null;
      }

      const record = assertFound(
        await collegeRepository.updateById(id, changes),
        'College'
      );

      await audit(auditService, {
        action: 'college.status_changed',
        entity: 'College',
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
  createCollegeService,
};

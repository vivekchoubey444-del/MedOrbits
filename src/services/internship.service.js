
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
  'paused',
  'closed',
  'filled',
]);

function createInternshipService({
  internshipRepository,
  auditService,
}) {
  requireDependency(internshipRepository, 'internshipRepository');

  const crud = createCrudService({
    repository: internshipRepository,
    entity: 'Internship',
    auditService,
  });

  async function updateInternship(id, changes, action, actor = {}) {
    requiredId(id);

    if (typeof internshipRepository.updateById !== 'function') {
      throw new TypeError(
        'Internship repository must implement updateById().',
      );
    }

    const record = assertFound(
      await internshipRepository.updateById(id, changes),
      'Internship',
    );

    await audit(auditService, {
      action,
      entity: 'Internship',
      entityId: record.id ?? id,
      actorId: actor.id,
      metadata: changes.status
        ? { status: changes.status }
        : {},
    });

    return record;
  }

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      if (!ALLOWED_STATUSES.has(status)) {
        throw new ServiceError(
          'Unsupported internship status.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
            details: {
              allowed: [...ALLOWED_STATUSES],
            },
          },
        );
      }

      return updateInternship(
        id,
        { status },
        'internship.status_changed',
        actor,
      );
    },

    async publish(id, actor = {}) {
      return updateInternship(
        id,
        {
          status: 'published',
          publishedAt: new Date(),
        },
        'internship.published',
        actor,
      );
    },
  };
}

module.exports = { createInternshipService };

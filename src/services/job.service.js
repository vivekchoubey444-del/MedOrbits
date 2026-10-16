
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

function createJobService({ jobRepository, auditService }) {
  requireDependency(jobRepository, 'jobRepository');

  const crud = createCrudService({
    repository: jobRepository,
    entity: 'Job',
    auditService,
  });

  async function updateJob(id, changes, action, actor = {}) {
    requiredId(id);

    if (typeof jobRepository.updateById !== 'function') {
      throw new TypeError(
        'Job repository must implement updateById().',
      );
    }

    const record = assertFound(
      await jobRepository.updateById(id, changes),
      'Job',
    );

    await audit(auditService, {
      action,
      entity: 'Job',
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
        throw new ServiceError('Unsupported job status.', {
          code: 'VALIDATION_ERROR',
          status: 422,
          details: {
            allowed: [...ALLOWED_STATUSES],
          },
        });
      }

      return updateJob(
        id,
        { status },
        'job.status_changed',
        actor,
      );
    },

    async publish(id, actor = {}) {
      return updateJob(
        id,
        {
          status: 'published',
          publishedAt: new Date(),
        },
        'job.published',
        actor,
      );
    },
  };
}

module.exports = { createJobService };

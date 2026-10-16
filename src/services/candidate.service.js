
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
  'active',
  'inactive',
  'blocked',
]);

function createCandidateService({
  candidateRepository,
  auditService,
}) {
  requireDependency(candidateRepository, 'candidateRepository');

  const crud = createCrudService({
    repository: candidateRepository,
    entity: 'Candidate',
    auditService,
    allowedSort: [
      'createdAt',
      'updatedAt',
      'name',
      'email',
      'status',
    ],
  });

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      requiredId(id, 'candidateId');

      if (
        typeof status !== 'string' ||
        !ALLOWED_STATUSES.has(status)
      ) {
        throw new ServiceError(
          'Unsupported candidate status.',
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
        candidateRepository.findById ||
        candidateRepository.getById;

      if (typeof findById !== 'function') {
        throw new TypeError(
          'Candidate repository must implement findById() or getById().'
        );
      }

      if (typeof candidateRepository.updateById !== 'function') {
        throw new TypeError(
          'Candidate repository must implement updateById().'
        );
      }

      const existing = assertFound(
        await findById.call(candidateRepository, id),
        'Candidate'
      );

      if (
        existing.status === status
      ) {
        return existing;
      }

      const record = assertFound(
        await candidateRepository.updateById(id, {
          status,
          updatedAt: new Date(),
        }),
        'Candidate'
      );

      await audit(auditService, {
        action: 'candidate.status_changed',
        entity: 'Candidate',
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
  createCandidateService,
};

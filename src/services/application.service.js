
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
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'withdrawn',
]);

const TERMINAL_STATUSES = new Set([
  'approved',
  'rejected',
  'withdrawn',
]);

function createApplicationService({
  applicationRepository,
  auditService,
}) {
  requireDependency(
    applicationRepository,
    'applicationRepository'
  );

  const crud = createCrudService({
    repository: applicationRepository,
    entity: 'Application',
    auditService,
    allowedSort: [
      'createdAt',
      'updatedAt',
      'submittedAt',
      'status',
    ],
  });

  function assertOwnerOrAdmin(record, actor = {}) {
    const isOwner =
      actor.id != null &&
      record.applicantId != null &&
      String(record.applicantId) === String(actor.id);

    if (!isOwner && actor.isAdmin !== true) {
      // Conceal whether another user's application exists.
      throw new ServiceError(
        'Application not found.',
        {
          code: 'NOT_FOUND',
          status: 404,
        }
      );
    }
  }

  async function findApplication(id) {
    const findById =
      applicationRepository.findById ||
      applicationRepository.getById;

    if (typeof findById !== 'function') {
      throw new TypeError(
        'Application repository must implement findById() or getById().'
      );
    }

    return assertFound(
      await findById.call(applicationRepository, id),
      'Application'
    );
  }

  async function updateApplication(id, changes) {
    if (typeof applicationRepository.updateById !== 'function') {
      throw new TypeError(
        'Application repository must implement updateById().'
      );
    }

    return assertFound(
      await applicationRepository.updateById(id, {
        ...changes,
        updatedAt: new Date(),
      }),
      'Application'
    );
  }

  return {
    ...crud,

    async setStatus(id, status, actor = {}) {
      requiredId(id, 'applicationId');

      if (
        typeof status !== 'string' ||
        !ALLOWED_STATUSES.has(status)
      ) {
        throw new ServiceError(
          'Unsupported application status.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
            details: {
              allowed: [...ALLOWED_STATUSES],
            },
          }
        );
      }

      const existing = await findApplication(id);

      assertOwnerOrAdmin(existing, actor);

      // Administrative decisions must not be made by applicants.
      if (
        ['under_review', 'approved', 'rejected'].includes(status) &&
        actor.isAdmin !== true
      ) {
        throw new ServiceError(
          'Only an authorized administrator can set this status.',
          {
            code: 'FORBIDDEN',
            status: 403,
          }
        );
      }

      if (
        TERMINAL_STATUSES.has(existing.status) &&
        existing.status !== status
      ) {
        throw new ServiceError(
          'This application has reached a terminal status and cannot be changed.',
          {
            code: 'INVALID_STATE',
            status: 409,
          }
        );
      }

      if (existing.status === status) {
        return existing;
      }

      const changes = { status };

      if (status === 'submitted') {
        if (existing.status !== 'draft') {
          throw new ServiceError(
            'Only draft applications can be submitted.',
            {
              code: 'INVALID_STATE',
              status: 409,
            }
          );
        }

        changes.submittedAt = new Date();
      }

      if (status === 'withdrawn' && actor.isAdmin !== true) {
        // Applicants may withdraw only their own applications.
        assertOwnerOrAdmin(existing, actor);
      }

      const record = await updateApplication(id, changes);

      await audit(auditService, {
        action: 'application.status_changed',
        entity: 'Application',
        entityId: id,
        actorId: actor.id,
        metadata: {
          previousStatus: existing.status,
          status,
        },
      });

      return record;
    },

    async submit(id, actor = {}) {
      requiredId(id, 'applicationId');
      requiredId(actor.id, 'actorId');

      const existing = await findApplication(id);

      assertOwnerOrAdmin(existing, actor);

      if (actor.isAdmin === true &&
          String(existing.applicantId) !== String(actor.id)) {
        throw new ServiceError(
          'Administrators cannot submit an application on behalf of an applicant through this operation.',
          {
            code: 'FORBIDDEN',
            status: 403,
          }
        );
      }

      if (existing.status !== 'draft') {
        throw new ServiceError(
          'Only draft applications can be submitted.',
          {
            code: 'INVALID_STATE',
            status: 409,
          }
        );
      }

      const record = await updateApplication(id, {
        status: 'submitted',
        submittedAt: new Date(),
      });

      await audit(auditService, {
        action: 'application.submitted',
        entity: 'Application',
        entityId: id,
        actorId: actor.id,
        metadata: {
          previousStatus: existing.status,
          status: 'submitted',
        },
      });

      return record;
    },
  };
}

module.exports = {
  createApplicationService,
};


'use strict';

const {
  ServiceError,
  requireDependency,
  requiredId,
  requiredString,
  plainObject,
  assertFound,
  createCrudService,
  audit,
} = require('./service-utils');

const ALLOWED_STATUSES = new Set([
  'pending',
  'under_review',
  'approved',
  'rejected',
  'deleted',
]);

const DOWNLOADABLE_STATUSES = new Set([
  'approved',
]);

function createDocumentService({
  documentRepository,
  storageService,
  auditService,
}) {
  requireDependency(documentRepository, 'documentRepository');
  requireDependency(storageService, 'storageService');

  const crud = createCrudService({
    repository: documentRepository,
    entity: 'Document',
    auditService,
    allowedSort: [
      'createdAt',
      'updatedAt',
      'originalName',
      'status',
      'size',
    ],
  });

  function assertOwnerOrAdmin(document, actor = {}) {
    const isAdmin = actor.isAdmin === true;

    const isOwner =
      actor.id != null &&
      document.ownerId != null &&
      String(actor.id) === String(document.ownerId);

    if (!isAdmin && !isOwner) {
      throw new ServiceError('Document not found.', {
        code: 'NOT_FOUND',
        status: 404,
      });
    }
  }

  function assertStatus(status) {
    if (!ALLOWED_STATUSES.has(status)) {
      throw new ServiceError('Unsupported document status.', {
        code: 'VALIDATION_ERROR',
        status: 422,
        details: {
          allowed: [...ALLOWED_STATUSES],
        },
      });
    }
  }

  return {
    ...crud,

    async getById(id, actor = {}) {
      requiredId(id);

      const document = assertFound(
        await documentRepository.findById(id),
        'Document',
      );

      assertOwnerOrAdmin(document, actor);

      return document;
    },

    async listForOwner(ownerId, query = {}) {
      requiredId(ownerId, 'ownerId');

      if (
        typeof documentRepository.listForOwner !== 'function'
      ) {
        throw new ServiceError(
          'Document listing is not configured.',
          {
            code: 'DOCUMENT_REPOSITORY_MISCONFIGURED',
            status: 501,
          },
        );
      }

      const limitValue = Number(query.limit);
      const limit =
        Number.isFinite(limitValue) && limitValue > 0
          ? Math.min(Math.floor(limitValue), 100)
          : 20;

      return documentRepository.listForOwner(ownerId, {
        limit,
        cursor:
          typeof query.cursor === 'string' &&
          query.cursor.length <= 512
            ? query.cursor
            : undefined,
        status: ALLOWED_STATUSES.has(query.status)
          ? query.status
          : undefined,
      });
    },

    async setStatus(id, status, actor = {}) {
      requiredId(id);
      assertStatus(status);

      const document = assertFound(
        await documentRepository.findById(id),
        'Document',
      );

      if (status === 'approved' || status === 'rejected') {
        if (actor.isAdmin !== true) {
          throw new ServiceError(
            'Only authorized reviewers can approve or reject documents.',
            {
              code: 'FORBIDDEN',
              status: 403,
            },
          );
        }
      } else {
        assertOwnerOrAdmin(document, actor);
      }

      if (document.status === 'deleted' && status !== 'deleted') {
        throw new ServiceError(
          'Deleted documents cannot be restored through this operation.',
          {
            code: 'INVALID_STATUS_TRANSITION',
            status: 409,
          },
        );
      }

      const changes = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'approved' || status === 'rejected') {
        changes.reviewedAt = new Date();
        changes.reviewedBy = actor.id;
      }

      const updated = assertFound(
        await documentRepository.updateById(id, changes),
        'Document',
      );

      await audit(auditService, {
        action: 'document.status_changed',
        entity: 'Document',
        entityId: id,
        actorId: actor.id,
        metadata: { status },
      });

      return updated;
    },

    async createDownloadUrl({
      documentId,
      ownerId,
      actor = {},
      expiresInSeconds = 300,
    } = {}) {
      requiredId(documentId, 'documentId');

      const document = assertFound(
        await documentRepository.findById(documentId),
        'Document',
      );

      assertOwnerOrAdmin(document, actor);

      if (
        document.status === 'deleted' ||
        document.status === 'rejected' ||
        !DOWNLOADABLE_STATUSES.has(document.status)
      ) {
        throw new ServiceError(
          'This document is not available for download.',
          {
            code: 'DOCUMENT_UNAVAILABLE',
            status: 403,
          },
        );
      }

      // If supplied, ownerId must match the authenticated identity.
      if (
        ownerId != null &&
        actor.id != null &&
        String(ownerId) !== String(actor.id) &&
        actor.isAdmin !== true
      ) {
        throw new ServiceError('Document not found.', {
          code: 'NOT_FOUND',
          status: 404,
        });
      }

      if (
        typeof storageService.createDownloadUrl !== 'function'
      ) {
        throw new ServiceError(
          'Document downloads are not configured.',
          {
            code: 'STORAGE_NOT_CONFIGURED',
            status: 501,
          },
        );
      }

      const result = await storageService.createDownloadUrl({
        storageKey: requiredString(
          document.storageKey,
          'storageKey',
          { max: 1024 },
        ),
        ownerId: document.ownerId,
        expiresInSeconds,
      });

      await audit(auditService, {
        action: 'document.download_url_created',
        entity: 'Document',
        entityId: document.id ?? documentId,
        actorId: actor.id,
      });

      return result;
    },

    async remove(id, actor = {}) {
      requiredId(id);

      const document = assertFound(
        await documentRepository.findById(id),
        'Document',
      );

      assertOwnerOrAdmin(document, actor);

      if (document.status === 'deleted') {
        return { id, deleted: true };
      }

      if (
        typeof storageService.remove !== 'function'
      ) {
        throw new ServiceError(
          'Document deletion is not configured.',
          {
            code: 'STORAGE_NOT_CONFIGURED',
            status: 501,
          },
        );
      }

      await storageService.remove({
        storageKey: document.storageKey,
        ownerId: document.ownerId,
      });

      const updated = assertFound(
        await documentRepository.updateById(id, {
          status: 'deleted',
          deletedAt: new Date(),
        }),
        'Document',
      );

      await audit(auditService, {
        action: 'document.deleted',
        entity: 'Document',
        entityId: id,
        actorId: actor.id,
      });

      return {
        id,
        deleted: true,
        document: updated,
      };
    },
  };
}

module.exports = { createDocumentService };

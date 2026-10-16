
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredId,
  requiredString,
  plainObject,
  assertFound,
  audit,
} = require('./service-utils');

const ALLOWED_CHANNELS = new Set([
  'in_app',
  'email',
  'push',
]);

const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_LIMIT = 20;

function createNotificationService({
  notificationRepository,
  pushProvider,
  emailService,
  auditService,
}) {
  requireDependency(notificationRepository, 'notificationRepository');

  function normalizeLimit(value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_LIST_LIMIT;
    }

    return Math.min(Math.floor(parsed), MAX_LIST_LIMIT);
  }

  function assertRecipient(item, userId) {
    if (
      userId == null ||
      item.recipientId == null ||
      String(item.recipientId) !== String(userId)
    ) {
      throw new ServiceError('Notification not found.', {
        code: 'NOT_FOUND',
        status: 404,
      });
    }
  }

  return {
    async create({
      recipientId,
      title,
      message,
      channel = 'in_app',
      metadata = {},
    } = {}) {
      requiredId(recipientId, 'recipientId');

      const safeTitle = requiredString(title, 'title', {
        max: 160,
      });

      const safeMessage = requiredString(message, 'message', {
        max: 5000,
      });

      if (!ALLOWED_CHANNELS.has(channel)) {
        throw new ServiceError(
          'Unsupported notification channel.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
            details: {
              allowed: [...ALLOWED_CHANNELS],
            },
          },
        );
      }

      const safeMetadata = plainObject(metadata, 'metadata');

      if (
        channel === 'email' &&
        (
          typeof safeMetadata.email !== 'string' ||
          safeMetadata.email.trim().length === 0
        )
      ) {
        throw new ServiceError(
          'A recipient email address is required.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          },
        );
      }

      const item = assertFound(
        await notificationRepository.create({
          recipientId,
          title: safeTitle,
          message: safeMessage,
          channel,
          metadata: safeMetadata,
          status: channel === 'in_app' ? 'unread' : 'queued',
        }),
        'Notification',
      );

      // In-app notifications are persisted and made available for listing.
      // Email and push delivery errors are recorded against the notification.
      if (channel === 'in_app') {
        await audit(auditService, {
          action: 'notification.created',
          entity: 'Notification',
          entityId: item.id,
          actorId: recipientId,
          metadata: { channel },
        });

        return item;
      }

      try {
        if (channel === 'email') {
          if (typeof emailService?.send !== 'function') {
            throw new ServiceError(
              'Email channel is not configured.',
              {
                code: 'EMAIL_NOT_CONFIGURED',
                status: 503,
              },
            );
          }

          await emailService.send({
            to: safeMetadata.email.trim(),
            subject: safeTitle,
            text: safeMessage,
          });
        }

        if (channel === 'push') {
          if (typeof pushProvider?.send !== 'function') {
            throw new ServiceError(
              'Push channel is not configured.',
              {
                code: 'PUSH_NOT_CONFIGURED',
                status: 503,
              },
            );
          }

          await pushProvider.send({
            recipientId,
            title: safeTitle,
            message: safeMessage,
            metadata: safeMetadata,
          });
        }

        const updated = assertFound(
          await notificationRepository.updateById(item.id, {
            status: 'sent',
            sentAt: new Date(),
          }),
          'Notification',
        );

        await audit(auditService, {
          action: 'notification.sent',
          entity: 'Notification',
          entityId: item.id,
          actorId: recipientId,
          metadata: { channel },
        });

        return updated;
      } catch (error) {
        try {
          await notificationRepository.updateById(item.id, {
            status: 'failed',
            failureCode:
              typeof error?.code === 'string'
                ? error.code
                : 'DELIVERY_FAILED',
          });
        } catch {
          // Report status-persistence failures through infrastructure
          // monitoring. Do not expose provider internals to API clients.
        }

        if (error instanceof ServiceError) {
          throw error;
        }

        throw new ServiceError(
          'Notification delivery failed. Please try again later.',
          {
            code: 'DELIVERY_FAILED',
            status: 502,
          },
        );
      }
    },

    async listForUser(userId, query = {}) {
      requiredId(userId, 'userId');

      if (
        !query ||
        typeof query !== 'object' ||
        Array.isArray(query)
      ) {
        throw new ServiceError('Invalid notification query.', {
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }

      if (
        typeof notificationRepository.listForRecipient !== 'function'
      ) {
        throw new TypeError(
          'notificationRepository must implement listForRecipient().',
        );
      }

      return notificationRepository.listForRecipient(userId, {
        limit: normalizeLimit(query.limit),
        cursor:
          typeof query.cursor === 'string' && query.cursor.length <= 512
            ? query.cursor
            : undefined,
      });
    },

    async markRead(id, userId) {
      requiredId(id, 'id');
      requiredId(userId, 'userId');

      const item = assertFound(
        await notificationRepository.findById(id),
        'Notification',
      );

      assertRecipient(item, userId);

      if (item.status === 'read') {
        return item;
      }

      const updated = assertFound(
        await notificationRepository.updateById(id, {
          status: 'read',
          readAt: new Date(),
        }),
        'Notification',
      );

      await audit(auditService, {
        action: 'notification.read',
        entity: 'Notification',
        entityId: id,
        actorId: userId,
      });

      return updated;
    },
  };
}

module.exports = { createNotificationService };

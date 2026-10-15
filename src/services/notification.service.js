'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, assertFound, audit } = require('./service-utils');
function createNotificationService({ notificationRepository, pushProvider, emailService, auditService }) {
  requireDependency(notificationRepository, 'notificationRepository');
  return {
    async create({ recipientId, title, message, channel = 'in_app', metadata = {} }) {
      requiredId(recipientId, 'recipientId'); requiredString(title, 'title', { max: 160 }); requiredString(message, 'message', { max: 5000 });
      if (!['in_app', 'email', 'push'].includes(channel)) throw new ServiceError('Unsupported notification channel.', { code: 'VALIDATION_ERROR', status: 422 });
      const item = await notificationRepository.create({ recipientId, title, message, channel, metadata, status: 'queued' });
      try {
        if (channel === 'email') { if (!emailService?.send) throw new ServiceError('Email channel is not configured.', { status: 503 }); await emailService.send({ to: metadata.email, subject: title, text: message }); }
        if (channel === 'push') { if (!pushProvider?.send) throw new ServiceError('Push channel is not configured.', { status: 503 }); await pushProvider.send({ recipientId, title, message, metadata }); }
        if (channel !== 'in_app') await notificationRepository.updateById(item.id, { status: 'sent', sentAt: new Date() });
      } catch (error) { await notificationRepository.updateById(item.id, { status: 'failed', failureCode: error.code || 'DELIVERY_FAILED' }); throw error; }
      await audit(auditService, { action: 'notification.created', entity: 'Notification', entityId: item.id, actorId: recipientId });
      return item;
    },
    async listForUser(userId, query = {}) { requiredId(userId, 'userId'); if (typeof notificationRepository.listForRecipient !== 'function') throw new TypeError('notificationRepository must implement listForRecipient().'); return notificationRepository.listForRecipient(userId, { limit: Math.max(1, Math.min(100, Number(query.limit) || 20)), cursor: query.cursor }); },
    async markRead(id, userId) { const item = assertFound(await notificationRepository.findById(id), 'Notification'); if (String(item.recipientId) !== String(userId)) throw new ServiceError('Notification not found.', { code: 'NOT_FOUND', status: 404 }); return notificationRepository.updateById(id, { status: 'read', readAt: new Date() }); },
  };
}
module.exports = { createNotificationService };

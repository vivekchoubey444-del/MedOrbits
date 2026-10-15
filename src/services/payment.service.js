'use strict';
const { ServiceError, requireDependency, requiredId, requiredString, assertFound, audit } = require('./service-utils');
function createPaymentService({ paymentRepository, paymentProvider, auditService, webhookSecret, verifyWebhookSignature }) {
  requireDependency(paymentRepository, 'paymentRepository'); requireDependency(paymentProvider, 'paymentProvider');
  return {
    async createIntent({ userId, amount, currency = 'INR', description, metadata = {} }) {
      requiredId(userId, 'userId');
      if (!Number.isSafeInteger(amount) || amount < 1) throw new ServiceError('amount must be a positive integer in minor currency units.', { code: 'VALIDATION_ERROR', status: 422 });
      const code = requiredString(currency, 'currency', { min: 3, max: 3 }).toUpperCase();
      const payment = await paymentRepository.create({ userId, amount, currency: code, status: 'pending', description, metadata });
      const intent = await paymentProvider.createIntent({ amount, currency: code, reference: String(payment.id), description, metadata });
      await paymentRepository.updateById(payment.id, { providerIntentId: intent.id });
      await audit(auditService, { action: 'payment.intent_created', entity: 'Payment', entityId: payment.id, actorId: userId });
      return { paymentId: payment.id, status: 'pending', clientSecret: intent.clientSecret, providerIntentId: intent.id };
    },
    async getById(id, actor = {}) {
      const payment = assertFound(await paymentRepository.findById(id), 'Payment');
      if (!actor.isAdmin && String(payment.userId) !== String(actor.id)) throw new ServiceError('Payment not found.', { code: 'NOT_FOUND', status: 404 });
      return payment;
    },
    async handleWebhook({ rawBody, signature, headers }) {
      if (!Buffer.isBuffer(rawBody)) throw new ServiceError('Raw webhook body is required.', { code: 'INVALID_WEBHOOK', status: 400 });
      if (typeof verifyWebhookSignature !== 'function' || !webhookSecret) throw new ServiceError('Webhook signature verification is not configured.', { code: 'WEBHOOK_NOT_CONFIGURED', status: 503 });
      const valid = await verifyWebhookSignature({ rawBody, signature, headers, secret: webhookSecret });
      if (!valid) throw new ServiceError('Invalid webhook signature.', { code: 'INVALID_SIGNATURE', status: 400 });
      const event = await paymentProvider.parseWebhook({ rawBody, headers });
      if (!event?.id || !event?.type) throw new ServiceError('Malformed payment event.', { code: 'INVALID_WEBHOOK', status: 400 });
      if (typeof paymentRepository.hasProcessedEvent === 'function' && await paymentRepository.hasProcessedEvent(event.id)) return { received: true, duplicate: true };
      const mapping = { 'payment.succeeded': 'captured', 'payment.failed': 'failed', 'payment.cancelled': 'cancelled', 'payment.refunded': 'refunded' };
      const status = mapping[event.type];
      if (status && event.paymentId) await paymentRepository.updateByProviderIntentId(event.paymentId, { status, providerEventId: event.id, processedAt: new Date() });
      if (typeof paymentRepository.markEventProcessed === 'function') await paymentRepository.markEventProcessed({ eventId: event.id, type: event.type, processedAt: new Date() });
      await audit(auditService, { action: 'payment.webhook_processed', entity: 'Payment', entityId: event.paymentId, metadata: { eventId: event.id, type: event.type, status } });
      return { received: true, duplicate: false };
    },
  };
}
module.exports = { createPaymentService };

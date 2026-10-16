
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

const PAYMENT_STATUS_BY_EVENT = Object.freeze({
  'payment.succeeded': 'captured',
  'payment.failed': 'failed',
  'payment.cancelled': 'cancelled',
  'payment.refunded': 'refunded',
});

function createPaymentService({
  paymentRepository,
  paymentProvider,
  auditService,
  webhookSecret,
  verifyWebhookSignature,
}) {
  requireDependency(paymentRepository, 'paymentRepository');
  requireDependency(paymentProvider, 'paymentProvider');

  return {
    async createIntent({
      userId,
      amount,
      currency = 'INR',
      description,
      metadata = {},
    } = {}) {
      requiredId(userId, 'userId');

      if (!Number.isSafeInteger(amount) || amount < 1) {
        throw new ServiceError(
          'amount must be a positive integer in minor currency units.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          },
        );
      }

      const currencyCode = requiredString(currency, 'currency', {
        min: 3,
        max: 3,
      }).toUpperCase();

      if (!/^[A-Z]{3}$/.test(currencyCode)) {
        throw new ServiceError('Invalid currency code.', {
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }

      const safeMetadata = plainObject(metadata, 'metadata');

      if (
        description !== undefined &&
        description !== null &&
        typeof description !== 'string'
      ) {
        throw new ServiceError('description must be a string.', {
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }

      if (typeof paymentProvider.createIntent !== 'function') {
        throw new ServiceError(
          'Payment intent creation is not configured.',
          {
            code: 'PAYMENT_PROVIDER_MISCONFIGURED',
            status: 503,
          },
        );
      }

      const payment = assertFound(
        await paymentRepository.create({
          userId,
          amount,
          currency: currencyCode,
          status: 'pending',
          description,
          metadata: safeMetadata,
        }),
        'Payment',
      );

      let intent;

      try {
        intent = await paymentProvider.createIntent({
          amount,
          currency: currencyCode,
          reference: String(payment.id),
          description,
          metadata: safeMetadata,
        });
      } catch {
        // Preserve the payment record for reconciliation.
        // Do not blindly retry provider calls without idempotency.
        throw new ServiceError(
          'Unable to initialize payment. Please try again later.',
          {
            code: 'PAYMENT_INITIALIZATION_FAILED',
            status: 502,
          },
        );
      }

      if (!intent || typeof intent.id !== 'string' || !intent.id) {
        throw new ServiceError(
          'The payment provider returned an invalid intent.',
          {
            code: 'PAYMENT_PROVIDER_ERROR',
            status: 502,
          },
        );
      }

      const updatedPayment = assertFound(
        await paymentRepository.updateById(payment.id, {
          providerIntentId: intent.id,
        }),
        'Payment',
      );

      await audit(auditService, {
        action: 'payment.intent_created',
        entity: 'Payment',
        entityId: payment.id,
        actorId: userId,
        metadata: {
          currency: currencyCode,
          amount,
        },
      });

      return {
        paymentId: updatedPayment.id,
        status: updatedPayment.status || 'pending',
        clientSecret:
          typeof intent.clientSecret === 'string'
            ? intent.clientSecret
            : null,
        providerIntentId: intent.id,
      };
    },

    async getById(id, actor = {}) {
      requiredId(id);

      const payment = assertFound(
        await paymentRepository.findById(id),
        'Payment',
      );

      const isOwner =
        actor.id != null &&
        payment.userId != null &&
        String(payment.userId) === String(actor.id);

      if (actor.isAdmin !== true && !isOwner) {
        throw new ServiceError('Payment not found.', {
          code: 'NOT_FOUND',
          status: 404,
        });
      }

      return payment;
    },

    async handleWebhook({
      rawBody,
      signature,
      headers,
    } = {}) {
      if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
        throw new ServiceError('Raw webhook body is required.', {
          code: 'INVALID_WEBHOOK',
          status: 400,
        });
      }

      if (
        typeof verifyWebhookSignature !== 'function' ||
        typeof webhookSecret !== 'string' ||
        webhookSecret.length === 0
      ) {
        throw new ServiceError(
          'Webhook signature verification is not configured.',
          {
            code: 'WEBHOOK_NOT_CONFIGURED',
            status: 503,
          },
        );
      }

      let valid;

      try {
        valid = await verifyWebhookSignature({
          rawBody,
          signature,
          headers,
          secret: webhookSecret,
        });
      } catch {
        throw new ServiceError(
          'Webhook signature verification failed.',
          {
            code: 'INVALID_SIGNATURE',
            status: 400,
          },
        );
      }

      if (valid !== true) {
        throw new ServiceError('Invalid webhook signature.', {
          code: 'INVALID_SIGNATURE',
          status: 400,
        });
      }

      if (typeof paymentProvider.parseWebhook !== 'function') {
        throw new ServiceError(
          'Webhook parsing is not configured.',
          {
            code: 'WEBHOOK_NOT_CONFIGURED',
            status: 503,
          },
        );
      }

      const event = await paymentProvider.parseWebhook({
        rawBody,
        headers,
      });

      if (
        !event ||
        typeof event.id !== 'string' ||
        !event.id ||
        typeof event.type !== 'string' ||
        !event.type
      ) {
        throw new ServiceError('Malformed payment event.', {
          code: 'INVALID_WEBHOOK',
          status: 400,
        });
      }

      if (
        typeof paymentRepository.hasProcessedEvent === 'function' &&
        await paymentRepository.hasProcessedEvent(event.id)
      ) {
        return {
          received: true,
          duplicate: true,
        };
      }

      const status = PAYMENT_STATUS_BY_EVENT[event.type];

      if (status && event.paymentId) {
        if (
          typeof paymentRepository.updateByProviderIntentId !==
          'function'
        ) {
          throw new ServiceError(
            'Provider intent updates are not configured.',
            {
              code: 'PAYMENT_REPOSITORY_MISCONFIGURED',
              status: 500,
            },
          );
        }

        const updated = await paymentRepository
          .updateByProviderIntentId(event.paymentId, {
            status,
            providerEventId: event.id,
            processedAt: new Date(),
          });

        if (!updated) {
          // Fail so the provider can retry. Do not mark an event
          // processed when its payment update has not succeeded.
          throw new ServiceError(
            'The payment associated with this event was not found.',
            {
              code: 'PAYMENT_NOT_FOUND',
              status: 404,
            },
          );
        }
      }

      if (
        typeof paymentRepository.markEventProcessed !== 'function'
      ) {
        throw new ServiceError(
          'Webhook event tracking is not configured.',
          {
            code: 'PAYMENT_REPOSITORY_MISCONFIGURED',
            status: 500,
          },
        );
      }

      /*
       * For production, updating the payment and recording the event
       * must be atomic, with a unique database constraint on event ID.
       * The two operations shown here require a transactional repository
       * implementation to be safe under concurrent webhook delivery.
       */
      await paymentRepository.markEventProcessed({
        eventId: event.id,
        type: event.type,
        processedAt: new Date(),
      });

      await audit(auditService, {
        action: 'payment.webhook_processed',
        entity: 'Payment',
        entityId: event.paymentId,
        metadata: {
          eventId: event.id,
          type: event.type,
          status,
        },
      });

      return {
        received: true,
        duplicate: false,
      };
    },
  };
}

module.exports = { createPaymentService };

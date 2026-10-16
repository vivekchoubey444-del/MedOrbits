
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredId,
  assertFound,
  audit,
} = require('./service-utils');

const TERMINAL_STATUSES = new Set([
  'cancelled',
  'expired',
]);

function createSubscriptionService({
  subscriptionRepository,
  planRepository,
  billingProvider,
  auditService,
}) {
  requireDependency(subscriptionRepository, 'subscriptionRepository');
  requireDependency(planRepository, 'planRepository');
  requireDependency(billingProvider, 'billingProvider');

  function assertOwnerOrAdmin(record, actor = {}) {
    const isAdmin = actor.isAdmin === true;
    const isOwner =
      actor.id != null &&
      record.userId != null &&
      String(record.userId) === String(actor.id);

    if (!isAdmin && !isOwner) {
      throw new ServiceError('Subscription not found.', {
        code: 'NOT_FOUND',
        status: 404,
      });
    }
  }

  return {
    async subscribe({ userId, planId, paymentMethodId } = {}) {
      requiredId(userId, 'userId');
      requiredId(planId, 'planId');

      if (
        typeof paymentMethodId !== 'string' ||
        paymentMethodId.trim().length === 0
      ) {
        throw new ServiceError('A valid payment method is required.', {
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }

      const plan = assertFound(
        await planRepository.findById(planId),
        'Subscription plan',
      );

      if (plan.active === false) {
        throw new ServiceError('This plan is unavailable.', {
          code: 'PLAN_UNAVAILABLE',
          status: 409,
        });
      }

      if (
        typeof subscriptionRepository.findActiveByUserId !== 'function'
      ) {
        throw new ServiceError(
          'Subscription eligibility checking is not configured.',
          {
            code: 'SUBSCRIPTION_REPOSITORY_MISCONFIGURED',
            status: 500,
          },
        );
      }

      const existing =
        await subscriptionRepository.findActiveByUserId(userId);

      if (existing) {
        throw new ServiceError(
          'An active subscription already exists.',
          {
            code: 'SUBSCRIPTION_EXISTS',
            status: 409,
          },
        );
      }

      /*
       * The billing provider should use an idempotency key derived from
       * a stable subscription-request ID to prevent duplicate billing
       * if this operation is retried.
       *
       * A database uniqueness constraint or transaction is also required
       * to prevent concurrent requests creating duplicate subscriptions.
       */
      const remote = await billingProvider.createSubscription({
        userId,
        plan,
        paymentMethodId: paymentMethodId.trim(),
      });

      if (!remote || !remote.id) {
        throw new ServiceError(
          'The billing provider returned an invalid subscription.',
          {
            code: 'BILLING_PROVIDER_ERROR',
            status: 502,
          },
        );
      }

      const record = await subscriptionRepository.create({
        userId,
        planId,
        status: remote.status || 'pending',
        providerSubscriptionId: remote.id,
        currentPeriodEnd: remote.currentPeriodEnd || null,
      });

      await audit(auditService, {
        action: 'subscription.created',
        entity: 'Subscription',
        entityId: record.id,
        actorId: userId,
      });

      return record;
    },

    async cancel(id, actor = {}) {
      requiredId(id);

      const record = assertFound(
        await subscriptionRepository.findById(id),
        'Subscription',
      );

      assertOwnerOrAdmin(record, actor);

      if (TERMINAL_STATUSES.has(record.status)) {
        return record;
      }

      if (!record.providerSubscriptionId) {
        throw new ServiceError(
          'The subscription has no billing-provider reference.',
          {
            code: 'BILLING_REFERENCE_MISSING',
            status: 409,
          },
        );
      }

      /*
       * Cancel remotely first. If the local update fails, reconcile the
       * local state with the provider using a retryable job or webhook.
       */
      await billingProvider.cancelSubscription(
        record.providerSubscriptionId,
      );

      const updated = assertFound(
        await subscriptionRepository.updateById(id, {
          status: 'cancelled',
          cancelledAt: new Date(),
        }),
        'Subscription',
      );

      await audit(auditService, {
        action: 'subscription.cancelled',
        entity: 'Subscription',
        entityId: id,
        actorId: actor.id,
      });

      return updated;
    },

    async getById(id, actor = {}) {
      requiredId(id);

      const record = assertFound(
        await subscriptionRepository.findById(id),
        'Subscription',
      );

      assertOwnerOrAdmin(record, actor);

      return record;
    },
  };
}

module.exports = { createSubscriptionService };

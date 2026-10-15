'use strict';
const { ServiceError, requireDependency, requiredId, assertFound, audit } = require('./service-utils');
function createSubscriptionService({ subscriptionRepository, planRepository, billingProvider, auditService }) {
  requireDependency(subscriptionRepository, 'subscriptionRepository'); requireDependency(planRepository, 'planRepository'); requireDependency(billingProvider, 'billingProvider');
  return {
    async subscribe({ userId, planId, paymentMethodId }) {
      requiredId(userId, 'userId'); requiredId(planId, 'planId');
      const plan = assertFound(await planRepository.findById(planId), 'Subscription plan');
      if (plan.active === false) throw new ServiceError('This plan is unavailable.', { code: 'PLAN_UNAVAILABLE', status: 409 });
      const existing = typeof subscriptionRepository.findActiveByUserId === 'function' ? await subscriptionRepository.findActiveByUserId(userId) : null;
      if (existing) throw new ServiceError('An active subscription already exists.', { code: 'SUBSCRIPTION_EXISTS', status: 409 });
      const remote = await billingProvider.createSubscription({ userId, plan, paymentMethodId });
      const record = await subscriptionRepository.create({ userId, planId, status: remote.status || 'pending', providerSubscriptionId: remote.id, currentPeriodEnd: remote.currentPeriodEnd || null });
      await audit(auditService, { action: 'subscription.created', entity: 'Subscription', entityId: record.id, actorId: userId });
      return record;
    },
    async cancel(id, actor = {}) {
      const record = assertFound(await subscriptionRepository.findById(id), 'Subscription');
      if (!actor.isAdmin && String(record.userId) !== String(actor.id)) throw new ServiceError('Subscription not found.', { code: 'NOT_FOUND', status: 404 });
      if (record.status === 'cancelled' || record.status === 'expired') return record;
      await billingProvider.cancelSubscription(record.providerSubscriptionId);
      const updated = await subscriptionRepository.updateById(id, { status: 'cancelled', cancelledAt: new Date() });
      await audit(auditService, { action: 'subscription.cancelled', entity: 'Subscription', entityId: id, actorId: actor.id });
      return updated;
    },
    async getById(id, actor = {}) { const record = assertFound(await subscriptionRepository.findById(id), 'Subscription'); if (!actor.isAdmin && String(record.userId) !== String(actor.id)) throw new ServiceError('Subscription not found.', { code: 'NOT_FOUND', status: 404 }); return record; },
  };
}
module.exports = { createSubscriptionService };

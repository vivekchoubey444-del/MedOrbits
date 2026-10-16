
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSubscriptionService } = require('../../../src/services/subscription.service');

function createHarness(overrides = {}) {
  const calls = {
    findPlanById: [],
    findActiveByUserId: [],
    createSubscription: [],
    findSubscriptionById: [],
    updateSubscriptionById: [],
    createProviderSubscription: [],
    cancelProviderSubscription: [],
    audit: [],
  };

  const plan = {
    id: 'PLAN-101',
    name: 'Premium',
    active: true,
  };

  const subscription = {
    id: 'SUB-101',
    userId: 'USER-101',
    planId: 'PLAN-101',
    status: 'active',
    providerSubscriptionId: 'PROVIDER-SUB-101',
    currentPeriodEnd: null,
  };

  const repositories = {
    subscriptionRepository: {
      findActiveByUserId: async (...args) => {
        calls.findActiveByUserId.push(args);
        return overrides.activeSubscriptionResult ?? null;
      },

      findById: async (...args) => {
        calls.findSubscriptionById.push(args);

        if (Object.hasOwn(overrides, 'findSubscriptionResult')) {
          return overrides.findSubscriptionResult;
        }

        return subscription;
      },

      create: async (...args) => {
        calls.createSubscription.push(args);

        if (Object.hasOwn(overrides, 'createSubscriptionResult')) {
          return overrides.createSubscriptionResult;
        }

        return subscription;
      },

      updateById: async (...args) => {
        calls.updateSubscriptionById.push(args);

        if (Object.hasOwn(overrides, 'updateSubscriptionResult')) {
          return overrides.updateSubscriptionResult;
        }

        return {
          ...subscription,
          ...args[1],
        };
      },
    },

    planRepository: {
      findById: async (...args) => {
        calls.findPlanById.push(args);

        if (Object.hasOwn(overrides, 'planResult')) {
          return overrides.planResult;
        }

        return plan;
      },
    },

    billingProvider: {
      createSubscription: async (...args) => {
        calls.createProviderSubscription.push(args);

        if (Object.hasOwn(overrides, 'providerCreateResult')) {
          return overrides.providerCreateResult;
        }

        return {
          id: 'PROVIDER-SUB-101',
          status: 'active',
          currentPeriodEnd: null,
        };
      },

      cancelSubscription: async (...args) => {
        calls.cancelProviderSubscription.push(args);

        if (overrides.cancelProviderError) {
          throw overrides.cancelProviderError;
        }

        return overrides.providerCancelResult;
      },
    },

    auditService: {
      record: async (...args) => {
        calls.audit.push(args);

        if (overrides.auditError) {
          throw overrides.auditError;
        }

        return undefined;
      },
    },
  };

  const service = createSubscriptionService(repositories);

  return {
    service,
    calls,
    plan,
    subscription,
    repositories,
  };
}

function ownerActor(id = 'USER-101') {
  return { id, isAdmin: false };
}

function adminActor(id = 'ADMIN-101') {
  return { id, isAdmin: true };
}

async function expectServiceError(promise, code, status) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

test('createSubscriptionService requires subscriptionRepository', () => {
  assert.throws(
    () =>
      createSubscriptionService({
        planRepository: {},
        billingProvider: {},
      }),
    TypeError,
  );
});

test('createSubscriptionService requires planRepository', () => {
  assert.throws(
    () =>
      createSubscriptionService({
        subscriptionRepository: {},
        billingProvider: {},
      }),
    TypeError,
  );
});

test('createSubscriptionService requires billingProvider', () => {
  assert.throws(
    () =>
      createSubscriptionService({
        subscriptionRepository: {},
        planRepository: {},
      }),
    TypeError,
  );
});

test('subscribe creates a subscription and audits the operation', async () => {
  const { service, calls, subscription } = createHarness();

  const result = await service.subscribe({
    userId: 'USER-101',
    planId: 'PLAN-101',
    paymentMethodId: 'pm_test_101',
  });

  assert.deepEqual(result, subscription);

  assert.deepEqual(calls.findPlanById, [['PLAN-101']]);
  assert.deepEqual(calls.findActiveByUserId, [['USER-101']]);

  assert.equal(calls.createProviderSubscription.length, 1);
  assert.deepEqual(calls.createProviderSubscription[0], [
    {
      userId: 'USER-101',
      plan: {
        id: 'PLAN-101',
        name: 'Premium',
        active: true,
      },
      paymentMethodId: 'pm_test_101',
    },
  ]);

  assert.deepEqual(calls.createSubscription, [
    [
      {
        userId: 'USER-101',
        planId: 'PLAN-101',
        status: 'active',
        providerSubscriptionId: 'PROVIDER-SUB-101',
        currentPeriodEnd: null,
      },
    ],
  ]);

  assert.deepEqual(calls.audit, [
    [
      {
        action: 'subscription.created',
        entity: 'Subscription',
        entityId: 'SUB-101',
        actorId: 'USER-101',
      },
    ],
  ]);
});

test('subscribe trims the payment method ID before calling the provider', async () => {
  const { service, calls } = createHarness();

  await service.subscribe({
    userId: 'USER-101',
    planId: 'PLAN-101',
    paymentMethodId: '  pm_test_101  ',
  });

  assert.equal(
    calls.createProviderSubscription[0][0].paymentMethodId,
    'pm_test_101',
  );
});

test('subscribe uses pending status when the provider omits status', async () => {
  const { service, calls } = createHarness({
    providerCreateResult: {
      id: 'PROVIDER-SUB-101',
    },
  });

  await service.subscribe({
    userId: 'USER-101',
    planId: 'PLAN-101',
    paymentMethodId: 'pm_test_101',
  });

  assert.equal(calls.createSubscription[0][0].status, 'pending');
  assert.equal(calls.createSubscription[0][0].currentPeriodEnd, null);
});

test('subscribe rejects a missing user ID', async () => {
  const { service } = createHarness();

  await expectServiceError(
    service.subscribe({
      planId: 'PLAN-101',
      paymentMethodId: 'pm_test_101',
    }),
    'VALIDATION_ERROR',
    422,
  );
});

test('subscribe rejects a missing plan ID', async () => {
  const { service } = createHarness();

  await expectServiceError(
    service.subscribe({
      userId: 'USER-101',
      paymentMethodId: 'pm_test_101',
    }),
    'VALIDATION_ERROR',
    422,
  );
});

test('subscribe rejects an empty payment method ID', async () => {
  const { service, calls } = createHarness();

  await expectServiceError(
    service.subscribe({
      userId: 'USER-101',
      planId: 'PLAN-101',
      paymentMethodId: '   ',
    }),
    'VALIDATION_ERROR',
    422,
  );

  assert.equal(calls.findPlanById.length, 0);
  assert.equal(calls.createProviderSubscription.length, 0);
});

test('subscribe rejects a non-string payment method ID', async () => {
  const { service } = createHarness();

  await expectServiceError(
    service.subscribe({
      userId: 'USER-101',
      planId: 'PLAN-101',
      paymentMethodId: 123,
    }),
    'VALIDATION_ERROR',
    422,
  );
});

test('subscribe rejects when the plan does not exist', async () => {
  const { service, calls } = createHarness({
    planResult: null,
  });

  await expectServiceError(
    service.subscribe({
      userId: 'USER-101',
      planId: 'PLAN-101',
      paymentMethodId: 'pm_test_101',
    }),
    'NOT_FOUND',
    404,
  );

  assert.equal(calls.createProviderSubscription.length, 0);
});

test('subscribe rejects an inactive plan', async () => {
  const { service, calls } = createHarness({
    planResult: {
      id: 'PLAN-101',
      active: false,
    },
  });

  await expectServiceError(
    service.subscribe({
      userId: 'USER-101',
      planId: 'PLAN-101',
      paymentMethodId: 'pm_test_101',
    }),
    'PLAN_UNAVAILABLE',
    409,
  );

  assert.equal(calls.findActiveByUserId.length, 0);
  assert.equal(calls.createProviderSubscription.length, 0);
});

test('subscribe rejects when the user already has an active subscription', async () => {
  const { service, calls } = createHarness({
    activeSubscriptionResult: {
      id: 'SUB-EXISTING',
      userId: 'USER-101',
      status: 'active',
    },
  });

  await expectServiceError(
    service.subscribe({
      userId: 'USER-101',
      planId: 'PLAN-101',
      paymentMethodId: 'pm_test_101',
    }),
    'SUBSCRIPTION_EXISTS',
    409,
  );

  assert.equal(calls.createProviderSubscription.length, 0);
  assert.equal(calls.createSubscription.length, 0);
});

test('subscribe rejects if the active-subscription repository method is missing', async () => {
  const { repositories } = createHarness();

  delete repositories.subscriptionRepository.findActiveByUserId;

  const service = createSubscriptionService(repositories);

  await expectServiceError(
    service.subscribe({
      userId: 'USER-101',
      planId: 'PLAN-101',
      paymentMethodId: 'pm_test_101',
    }),
    'SUBSCRIPTION_REPOSITORY_MISCONFIGURED',
    500,
  );
});

test('subscribe rejects an invalid provider response without an ID', async () => {
  const { service, calls } = createHarness({
    providerCreateResult: {
      status: 'active',
    },
  });

  await expectServiceError(
    service.subscribe({
      userId: 'USER-101',
      planId: 'PLAN-101',
      paymentMethodId: 'pm_test_101',
    }),
    'BILLING_PROVIDER_ERROR',
    502,
  );

  assert.equal(calls.createSubscription.length, 0);
});

test('subscribe propagates provider errors', async () => {
  const providerError = new Error('Billing provider unavailable');
  const { service, calls } = createHarness();

  calls.createProviderSubscription.push = calls.createProviderSubscription.push;

  const { repositories } = createHarness();
  repositories.billingProvider.createSubscription = async () => {
    throw providerError;
  };

  const failingService = createSubscriptionService(repositories);

  await assert.rejects(
    failingService.subscribe({
      userId: 'USER-101',
      planId: 'PLAN-101',
      paymentMethodId: 'pm_test_101',
    }),
    (error) => error === providerError,
  );
});

test('subscribe propagates subscription repository create errors', async () => {
  const repositoryError = new Error('Database write failed');
  const { repositories } = createHarness();

  repositories.subscriptionRepository.create = async () => {
    throw repositoryError;
  };

  const service = createSubscriptionService(repositories);

  await assert.rejects(
    service.subscribe({
      userId: 'USER-101',
      planId: 'PLAN-101',
      paymentMethodId: 'pm_test_101',
    }),
    (error) => error === repositoryError,
  );
});

test('subscribe does not fail if auditing fails', async () => {
  const { service, subscription } = createHarness({
    auditError: new Error('Audit storage unavailable'),
  });

  const result = await service.subscribe({
    userId: 'USER-101',
    planId: 'PLAN-101',
    paymentMethodId: 'pm_test_101',
  });

  assert.deepEqual(result, subscription);
});

test('getById returns a subscription to its owner', async () => {
  const { service, calls, subscription } = createHarness();

  const result = await service.getById('SUB-101', ownerActor());

  assert.deepEqual(result, subscription);
  assert.deepEqual(calls.findSubscriptionById, [['SUB-101']]);
});

test('getById allows an administrator to access a subscription', async () => {
  const { service, subscription } = createHarness();

  const result = await service.getById(
    'SUB-101',
    adminActor(),
  );

  assert.deepEqual(result, subscription);
});

test('getById hides another user subscription from non-admin users', async () => {
  const { service } = createHarness();

  await expectServiceError(
    service.getById('SUB-101', ownerActor('USER-OTHER')),
    'NOT_FOUND',
    404,
  );
});

test('getById rejects when the subscription does not exist', async () => {
  const { service } = createHarness({
    findSubscriptionResult: null,
  });

  await expectServiceError(
    service.getById('SUB-MISSING', ownerActor()),
    'NOT_FOUND',
    404,
  );
});

test('getById rejects a missing subscription ID', async () => {
  const { service } = createHarness();

  await expectServiceError(
    service.getById(undefined, ownerActor()),
    'VALIDATION_ERROR',
    422,
  );
});

test('cancel cancels the provider subscription and updates the record', async () => {
  const { service, calls } = createHarness();

  const result = await service.cancel('SUB-101', ownerActor());

  assert.equal(result.id, 'SUB-101');
  assert.equal(result.status, 'cancelled');
  assert.ok(result.cancelledAt instanceof Date);

  assert.deepEqual(calls.cancelProviderSubscription, [
    ['PROVIDER-SUB-101'],
  ]);

  assert.equal(calls.updateSubscriptionById.length, 1);
  assert.equal(calls.updateSubscriptionById[0][0], 'SUB-101');
  assert.equal(calls.updateSubscriptionById[0][1].status, 'cancelled');
  assert.ok(calls.updateSubscriptionById[0][1].cancelledAt instanceof Date);

  assert.deepEqual(calls.audit, [
    [
      {
        action: 'subscription.cancelled',
        entity: 'Subscription',
        entityId: 'SUB-101',
        actorId: 'USER-101',
      },
    ],
  ]);
});

test('cancel allows an administrator to cancel a subscription', async () => {
  const { service, calls } = createHarness();

  const result = await service.cancel('SUB-101', adminActor());

  assert.equal(result.status, 'cancelled');
  assert.equal(calls.cancelProviderSubscription.length, 1);
});

test('cancel rejects cancellation by a different user', async () => {
  const { service, calls } = createHarness();

  await expectServiceError(
    service.cancel('SUB-101', ownerActor('USER-OTHER')),
    'NOT_FOUND',
    404,
  );

  assert.equal(calls.cancelProviderSubscription.length, 0);
  assert.equal(calls.updateSubscriptionById.length, 0);
});

test('cancel returns an already-cancelled subscription without repeating cancellation', async () => {
  const cancelledSubscription = {
    id: 'SUB-101',
    userId: 'USER-101',
    status: 'cancelled',
    providerSubscriptionId: 'PROVIDER-SUB-101',
  };

  const { service, calls } = createHarness({
    findSubscriptionResult: cancelledSubscription,
  });

  const result = await service.cancel('SUB-101', ownerActor());

  assert.deepEqual(result, cancelledSubscription);
  assert.equal(calls.cancelProviderSubscription.length, 0);
  assert.equal(calls.updateSubscriptionById.length, 0);
  assert.equal(calls.audit.length, 0);
});

test('cancel returns an expired subscription without repeating cancellation', async () => {
  const expiredSubscription = {
    id: 'SUB-101',
    userId: 'USER-101',
    status: 'expired',
    providerSubscriptionId: 'PROVIDER-SUB-101',
  };

  const { service, calls } = createHarness({
    findSubscriptionResult: expiredSubscription,
  });

  const result = await service.cancel('SUB-101', ownerActor());

  assert.deepEqual(result, expiredSubscription);
  assert.equal(calls.cancelProviderSubscription.length, 0);
  assert.equal(calls.updateSubscriptionById.length, 0);
});

test('cancel rejects when the provider subscription reference is missing', async () => {
  const subscriptionWithoutProviderId = {
    id: 'SUB-101',
    userId: 'USER-101',
    status: 'active',
    providerSubscriptionId: null,
  };

  const { service, calls } = createHarness({
    findSubscriptionResult: subscriptionWithoutProviderId,
  });

  await expectServiceError(
    service.cancel('SUB-101', ownerActor()),
    'BILLING_REFERENCE_MISSING',
    409,
  );

  assert.equal(calls.cancelProviderSubscription.length, 0);
  assert.equal(calls.updateSubscriptionById.length, 0);
});

test('cancel propagates billing provider errors without updating the record', async () => {
  const providerError = new Error('Provider cancellation failed');
  const { repositories, calls } = createHarness();

  repositories.billingProvider.cancelSubscription = async () => {
    throw providerError;
  };

  const service = createSubscriptionService(repositories);

  await assert.rejects(
    service.cancel('SUB-101', ownerActor()),
    (error) => error === providerError,
  );

  assert.equal(calls.updateSubscriptionById.length, 0);
  assert.equal(calls.audit.length, 0);
});

test('cancel rejects when the updated subscription cannot be found', async () => {
  const { service, calls } = createHarness({
    updateSubscriptionResult: null,
  });

  await expectServiceError(
    service.cancel('SUB-101', ownerActor()),
    'NOT_FOUND',
    404,
  );

  assert.equal(calls.cancelProviderSubscription.length, 1);
  assert.equal(calls.audit.length, 0);
});

test('cancel does not fail if auditing fails', async () => {
  const { service } = createHarness({
    auditError: new Error('Audit storage unavailable'),
  });

  const result = await service.cancel('SUB-101', ownerActor());

  assert.equal(result.status, 'cancelled');
});

test('cancel rejects a missing subscription ID', async () => {
  const { service } = createHarness();

  await expectServiceError(
    service.cancel(undefined, ownerActor()),
    'VALIDATION_ERROR',
    422,
  );
});

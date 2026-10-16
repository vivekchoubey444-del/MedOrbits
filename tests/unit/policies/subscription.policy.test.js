'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canCreateSubscription,
  canViewSubscription,
  canUpdateSubscription,
  canCancelSubscription,
  canChangeSubscriptionPlan,
  canGrantSubscriptionEntitlement,
  hasActiveEntitlement,
} = require('../../../src/policies/subscription.policy');
const NOW = Date.parse('2026-10-16T12:00:00.000Z');
function makeActor(overrides = {}) {
  return {
    id: 'user-1',
    role: 'user',
    permissions: [],
    ...overrides,
  };
}
function makeSubscription(overrides = {}) {
  return {
    id: 'subscription-1',
    userId: 'user-1',
    status: 'active',
    planId: 'plan-basic',
    currentPeriodStart: '2026-10-01T00:00:00.000Z',
    currentPeriodEnd: '2026-11-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    entitlements: ['course-access'],
    ...overrides,
  };
}
test('canCreateSubscription', async (t) => {
  await t.test('allows eligible users to create their own subscription', () => {
    assert.equal(
      canCreateSubscription(makeActor()),
      true
    );
    assert.equal(
      canCreateSubscription(
        makeActor({ role: 'student' }),
        { userId: 'user-1' }
      ),
      true
    );
    assert.equal(
      canCreateSubscription(
        makeActor({ role: 'candidate' }),
        { ownerId: 'user-1' }
      ),
      true
    );
    assert.equal(
      canCreateSubscription(
        makeActor({ role: 'employer' }),
        { customerUserId: 'user-1' }
      ),
      true
    );
  });
  await t.test('rejects a missing actor', () => {
    assert.equal(canCreateSubscription(null), false);
    assert.equal(canCreateSubscription(undefined), false);
  });
  await t.test('allows admins and actors with create-any permission', () => {
    assert.equal(
      canCreateSubscription(makeActor({ role: 'admin' })),
      true
    );
    assert.equal(
      canCreateSubscription(
        makeActor({
          role: 'guest',
          permissions: ['subscriptions:create:any'],
        })
      ),
      true
    );
  });
  await t.test('rejects roles that cannot create subscriptions', () => {
    assert.equal(
      canCreateSubscription(makeActor({ role: 'guest' })),
      false
    );
    assert.equal(
      canCreateSubscription(makeActor({ role: 'recruiter' })),
      false
    );
  });
  await t.test('rejects suspended actors without a privileged override', () => {
    assert.equal(
      canCreateSubscription(
        makeActor({ isSuspended: true })
      ),
      false
    );
    assert.equal(
      canCreateSubscription(
        makeActor({
          isSuspended: true,
          role: 'admin',
        })
      ),
      true
    );
    assert.equal(
      canCreateSubscription(
        makeActor({
          isSuspended: true,
          permissions: ['subscriptions:create:any'],
        })
      ),
      true
    );
  });
  await t.test('rejects attempts to create subscriptions for another user', () => {
    assert.equal(
      canCreateSubscription(
        makeActor(),
        { userId: 'user-2' }
      ),
      false
    );
    assert.equal(
      canCreateSubscription(
        makeActor(),
        { ownerId: 'user-2' }
      ),
      false
    );
    assert.equal(
      canCreateSubscription(
        makeActor(),
        { customerUserId: 'user-2' }
      ),
      false
    );
  });
  await t.test('accepts an explicitly matching owner identifier', () => {
    assert.equal(
      canCreateSubscription(
        makeActor(),
        { userId: 'user-1' }
      ),
      true
    );
  });
  await t.test('does not validate billing values at the policy layer', () => {
    assert.equal(
      canCreateSubscription(
        makeActor(),
        {
          userId: 'user-1',
          amount: -100,
          currency: 'INVALID',
          planId: 'untrusted-plan',
        }
      ),
      true
    );
  });
});
test('canViewSubscription', async (t) => {
  await t.test('allows the subscription owner to view it', () => {
    assert.equal(
      canViewSubscription(
        makeActor(),
        makeSubscription()
      ),
      true
    );
  });
  await t.test('denies access to a different user', () => {
    assert.equal(
      canViewSubscription(
        makeActor({ id: 'user-2' }),
        makeSubscription()
      ),
      false
    );
  });
  await t.test('allows admins and read-any permission holders', () => {
    assert.equal(
      canViewSubscription(
        makeActor({ role: 'admin' }),
        makeSubscription({ userId: 'user-2' })
      ),
      true
    );
    assert.equal(
      canViewSubscription(
        makeActor({
          permissions: ['subscriptions:read:any'],
        }),
        makeSubscription({ userId: 'user-2' })
      ),
      true
    );
  });
  await t.test('supports ownerId and customerUserId ownership fields', () => {
    assert.equal(
      canViewSubscription(
        makeActor(),
        makeSubscription({
          userId: null,
          ownerId: 'user-1',
        })
      ),
      true
    );
    assert.equal(
      canViewSubscription(
        makeActor(),
        makeSubscription({
          userId: null,
          ownerId: null,
          customerUserId: 'user-1',
        })
      ),
      true
    );
  });
  await t.test('allows an authorized employer to view employer subscriptions', () => {
    assert.equal(
      canViewSubscription(
        makeActor({
          role: 'employer',
          id: 'employer-user-1',
          employerId: 'employer-1',
          permissions: ['subscriptions:read:employer'],
        }),
        makeSubscription({
          userId: 'another-user',
          employerId: 'employer-1',
        })
      ),
      true
    );
  });
  await t.test('denies employer access without the required permission', () => {
    assert.equal(
      canViewSubscription(
        makeActor({
          role: 'employer',
          employerId: 'employer-1',
        }),
        makeSubscription({
          userId: 'another-user',
          employerId: 'employer-1',
        })
      ),
      false
    );
  });
  await t.test('denies employer access when the employer IDs differ', () => {
    assert.equal(
      canViewSubscription(
        makeActor({
          role: 'employer',
          employerId: 'employer-1',
          permissions: ['subscriptions:read:employer'],
        }),
        makeSubscription({
          userId: 'another-user',
          employerId: 'employer-2',
        })
      ),
      false
    );
  });
  await t.test('does not grant employer access to a non-employer role', () => {
    assert.equal(
      canViewSubscription(
        makeActor({
          role: 'user',
          employerId: 'employer-1',
          permissions: ['subscriptions:read:employer'],
        }),
        makeSubscription({
          userId: 'another-user',
          employerId: 'employer-1',
        })
      ),
      false
    );
  });
  await t.test('rejects missing actors or subscriptions', () => {
    assert.equal(
      canViewSubscription(null, makeSubscription()),
      false
    );
    assert.equal(
      canViewSubscription(makeActor(), null),
      false
    );
    assert.equal(
      canViewSubscription(undefined, undefined),
      false
    );
  });
});
test('canUpdateSubscription', async (t) => {
  await t.test('allows the owner to update permitted fields', () => {
    assert.equal(
      canUpdateSubscription(
        makeActor(),
        makeSubscription(),
        { description: 'Updated description' }
      ),
      true
    );
    assert.equal(
      canUpdateSubscription(
        makeActor(),
        makeSubscription(),
        { metadata: { source: 'portal' } }
      ),
      true
    );
  });
  await t.test('rejects updates by non-owners', () => {
    assert.equal(
      canUpdateSubscription(
        makeActor({ id: 'user-2' }),
        makeSubscription(),
        { description: 'Changed' }
      ),
      false
    );
  });
  await t.test('allows admins and update-any permission holders', () => {
    assert.equal(
      canUpdateSubscription(
        makeActor({ role: 'admin' }),
        makeSubscription({ userId: 'user-2' }),
        { status: 'cancelled' }
      ),
      true
    );
    assert.equal(
      canUpdateSubscription(
        makeActor({
          permissions: ['subscriptions:update:any'],
        }),
        makeSubscription({ userId: 'user-2' }),
        { amount: 100 }
      ),
      true
    );
  });
  await t.test('rejects missing actors or subscriptions', () => {
    assert.equal(
      canUpdateSubscription(null, makeSubscription(), {}),
      false
    );
    assert.equal(
      canUpdateSubscription(makeActor(), null, {}),
      false
    );
  });
  await t.test('rejects invalid change objects for ordinary owners', () => {
    assert.equal(
      canUpdateSubscription(
        makeActor(),
        makeSubscription(),
        null
      ),
      false
    );
    assert.equal(
      canUpdateSubscription(
        makeActor(),
        makeSubscription(),
        undefined
      ),
      false
    );
    assert.equal(
      canUpdateSubscription(
        makeActor(),
        makeSubscription(),
        []
      ),
      false
    );
    assert.equal(
      canUpdateSubscription(
        makeActor(),
        makeSubscription(),
        'description'
      ),
      false
    );
  });
  await t.test('blocks changes to protected subscription fields', () => {
    const forbiddenFields = [
      'id',
      '_id',
      'userId',
      'ownerId',
      'customerUserId',
      'employerId',
      'status',
      'paymentStatus',
      'planId',
      'price',
      'amount',
      'currency',
      'providerSubscriptionId',
      'currentPeriodStart',
      'currentPeriodEnd',
      'cancelAtPeriodEnd',
      'cancelledAt',
      'entitlements',
      'createdAt',
      'updatedAt',
    ];
    for (const field of forbiddenFields) {
      assert.equal(
        canUpdateSubscription(
          makeActor(),
          makeSubscription(),
          { [field]: 'tampered-value' }
        ),
        false,
        `Expected owner update to reject protected field: ${field}`
      );
    }
  });
  await t.test('allows unrelated fields not listed as protected', () => {
    assert.equal(
      canUpdateSubscription(
        makeActor(),
        makeSubscription(),
        {
          description: 'Updated',
          metadata: { source: 'dashboard' },
        }
      ),
      true
    );
  });
});
test('canCancelSubscription', async (t) => {
  await t.test('allows an owner to cancel an active subscription', () => {
    assert.equal(
      canCancelSubscription(
        makeActor(),
        makeSubscription({ status: 'active' })
      ),
      true
    );
  });
  await t.test('allows cancellation for supported statuses', () => {
    for (const status of [
      'active',
      'trialing',
      'past_due',
      'incomplete',
    ]) {
      assert.equal(
        canCancelSubscription(
          makeActor(),
          makeSubscription({ status })
        ),
        true,
        `Expected cancellation to be allowed for status: ${status}`
      );
    }
  });
  await t.test('rejects unsupported subscription statuses', () => {
    for (const status of [
      'created',
      'pending',
      'cancelled',
      'canceled',
      'expired',
      'succeeded',
      'unknown',
    ]) {
      assert.equal(
        canCancelSubscription(
          makeActor(),
          makeSubscription({ status })
        ),
        false,
        `Expected cancellation to be denied for status: ${status}`
      );
    }
  });
  await t.test('normalizes subscription status', () => {
    assert.equal(
      canCancelSubscription(
        makeActor(),
        makeSubscription({ status: ' ACTIVE ' })
      ),
      true
    );
  });
  await t.test('rejects subscriptions already scheduled for cancellation', () => {
    assert.equal(
      canCancelSubscription(
        makeActor(),
        makeSubscription({ cancelAtPeriodEnd: true })
      ),
      false
    );
  });
  await t.test('rejects subscriptions already marked cancelled', () => {
    assert.equal(
      canCancelSubscription(
        makeActor(),
        makeSubscription({
          cancelledAt: '2026-10-10T00:00:00.000Z',
        })
      ),
      false
    );
  });
  await t.test('allows admins and cancel-any permission holders for eligible subscriptions', () => {
    assert.equal(
      canCancelSubscription(
        makeActor({ role: 'admin' }),
        makeSubscription({ userId: 'user-2' })
      ),
      true
    );
    assert.equal(
      canCancelSubscription(
        makeActor({
          permissions: ['subscriptions:cancel:any'],
        }),
        makeSubscription({ userId: 'user-2' })
      ),
      true
    );
  });
  await t.test('privileged access does not bypass cancellation-state restrictions', () => {
    assert.equal(
      canCancelSubscription(
        makeActor({ role: 'admin' }),
        makeSubscription({ status: 'cancelled' })
      ),
      false
    );
    assert.equal(
      canCancelSubscription(
        makeActor({
          permissions: ['subscriptions:cancel:any'],
        }),
        makeSubscription({ cancelAtPeriodEnd: true })
      ),
      false
    );
  });
  await t.test('rejects non-owners without cancellation privileges', () => {
    assert.equal(
      canCancelSubscription(
        makeActor({ id: 'user-2' }),
        makeSubscription()
      ),
      false
    );
  });
  await t.test('rejects missing actors or subscriptions', () => {
    assert.equal(
      canCancelSubscription(null, makeSubscription()),
      false
    );
    assert.equal(
      canCancelSubscription(makeActor(), null),
      false
    );
  });
});
test('canChangeSubscriptionPlan', async (t) => {
  await t.test('allows an owner with permission to change an active plan', () => {
    assert.equal(
      canChangeSubscriptionPlan(
        makeActor({
          permissions: ['subscriptions:plan:change:self'],
        }),
        makeSubscription({ status: 'active' })
      ),
      true
    );
  });
  await t.test('allows an owner with permission to change a trial plan', () => {
    assert.equal(
      canChangeSubscriptionPlan(
        makeActor({
          permissions: ['subscriptions:plan:change:self'],
        }),
        makeSubscription({ status: 'trialing' })
      ),
      true
    );
  });
  await t.test('requires the self-service plan-change permission', () => {
    assert.equal(
      canChangeSubscriptionPlan(
        makeActor(),
        makeSubscription({ status: 'active' })
      ),
      false
    );
  });
  await t.test('rejects plan changes by non-owners', () => {
    assert.equal(
      canChangeSubscriptionPlan(
        makeActor({
          id: 'user-2',
          permissions: ['subscriptions:plan:change:self'],
        }),
        makeSubscription()
      ),
      false
    );
  });
  await t.test('rejects self-service changes for unsupported statuses', () => {
    for (const status of [
      'past_due',
      'incomplete',
      'cancelled',
      'expired',
      'pending',
    ]) {
      assert.equal(
        canChangeSubscriptionPlan(
          makeActor({
            permissions: ['subscriptions:plan:change:self'],
          }),
          makeSubscription({ status })
        ),
        false,
        `Expected plan change to be denied for status: ${status}`
      );
    }
  });
  await t.test('normalizes status before evaluating self-service changes', () => {
    assert.equal(
      canChangeSubscriptionPlan(
        makeActor({
          permissions: ['subscriptions:plan:change:self'],
        }),
        makeSubscription({ status: ' ACTIVE ' })
      ),
      true
    );
  });
  await t.test('allows admins and plan-change-any permission holders', () => {
    assert.equal(
      canChangeSubscriptionPlan(
        makeActor({ role: 'admin' }),
        makeSubscription({ userId: 'user-2', status: 'cancelled' })
      ),
      true
    );
    assert.equal(
      canChangeSubscriptionPlan(
        makeActor({
          permissions: ['subscriptions:plan:change:any'],
        }),
        makeSubscription({ userId: 'user-2', status: 'expired' })
      ),
      true
    );
  });
  await t.test('rejects missing actors or subscriptions', () => {
    assert.equal(
      canChangeSubscriptionPlan(null, makeSubscription()),
      false
    );
    assert.equal(
      canChangeSubscriptionPlan(makeActor(), null),
      false
    );
  });
});
test('canGrantSubscriptionEntitlement', async (t) => {
  await t.test('allows admins to initiate entitlement granting', () => {
    assert.equal(
      canGrantSubscriptionEntitlement(
        makeActor({ role: 'admin' })
      ),
      true
    );
  });
  await t.test('allows actors with the entitlement-grant permission', () => {
    assert.equal(
      canGrantSubscriptionEntitlement(
        makeActor({
          permissions: ['subscriptions:entitlements:grant'],
        })
      ),
      true
    );
  });
  await t.test('denies actors without the required permission', () => {
    assert.equal(
      canGrantSubscriptionEntitlement(makeActor()),
      false
    );
    assert.equal(
      canGrantSubscriptionEntitlement(
        makeActor({
          permissions: ['subscriptions:read:any'],
        })
      ),
      false
    );
  });
  await t.test('returns false for missing actors', () => {
    assert.equal(canGrantSubscriptionEntitlement(null), false);
    assert.equal(canGrantSubscriptionEntitlement(undefined), false);
  });
  await t.test('returns a boolean result', () => {
    assert.equal(
      typeof canGrantSubscriptionEntitlement(makeActor()),
      'boolean'
    );
    assert.equal(
      typeof canGrantSubscriptionEntitlement(
        makeActor({ role: 'admin' })
      ),
      'boolean'
    );
  });
});
test('hasActiveEntitlement', async (t) => {
  await t.test('grants an entitlement for an active subscription', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription(),
        'course-access',
        NOW
      ),
      true
    );
  });
  await t.test('grants an entitlement for a trialing subscription', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({ status: 'trialing' }),
        'course-access',
        NOW
      ),
      true
    );
  });
  await t.test('normalizes status before checking entitlement access', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({ status: ' ACTIVE ' }),
        'course-access',
        NOW
      ),
      true
    );
  });
  await t.test('denies entitlements for unsupported statuses', () => {
    for (const status of [
      'created',
      'pending',
      'past_due',
      'incomplete',
      'cancelled',
      'canceled',
      'expired',
      'unknown',
    ]) {
      assert.equal(
        hasActiveEntitlement(
          makeSubscription({ status }),
          'course-access',
          NOW
        ),
        false,
        `Expected entitlement access to be denied for status: ${status}`
      );
    }
  });
  await t.test('denies entitlements that are not assigned', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription(),
        'premium-access',
        NOW
      ),
      false
    );
  });
  await t.test('trims the requested entitlement name', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription(),
        ' course-access ',
        NOW
      ),
      true
    );
  });
  await t.test('rejects empty or invalid entitlement names', () => {
    for (const entitlement of [
      '',
      '   ',
      null,
      undefined,
      123,
      {},
    ]) {
      assert.equal(
        hasActiveEntitlement(
          makeSubscription(),
          entitlement,
          NOW
        ),
        false
      );
    }
  });
  await t.test('rejects missing or invalid subscription objects', () => {
    assert.equal(
      hasActiveEntitlement(null, 'course-access', NOW),
      false
    );
    assert.equal(
      hasActiveEntitlement(undefined, 'course-access', NOW),
      false
    );
    assert.equal(
      hasActiveEntitlement('subscription', 'course-access', NOW),
      false
    );
    assert.equal(
      hasActiveEntitlement([], 'course-access', NOW),
      false
    );
  });
  await t.test('rejects malformed entitlement collections', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({ entitlements: null }),
        'course-access',
        NOW
      ),
      false
    );
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({ entitlements: 'course-access' }),
        'course-access',
        NOW
      ),
      false
    );
  });
  await t.test('allows access when no period end is specified', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({ currentPeriodEnd: null }),
        'course-access',
        NOW
      ),
      true
    );
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({ currentPeriodEnd: undefined }),
        'course-access',
        NOW
      ),
      true
    );
  });
  await t.test('allows access before the period end', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({
          currentPeriodEnd: '2026-10-16T12:00:01.000Z',
        }),
        'course-access',
        NOW
      ),
      true
    );
  });
  await t.test('denies access at the exact period end', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({
          currentPeriodEnd: new Date(NOW).toISOString(),
        }),
        'course-access',
        NOW
      ),
      false
    );
  });
  await t.test('denies access after the period end', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({
          currentPeriodEnd: '2026-10-16T11:59:59.000Z',
        }),
        'course-access',
        NOW
      ),
      false
    );
  });
  await t.test('fails closed when the period end is invalid', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription({ currentPeriodEnd: 'not-a-date' }),
        'course-access',
        NOW
      ),
      false
    );
  });
  await t.test('accepts a Date object as the current time', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription(),
        'course-access',
        new Date(NOW)
      ),
      true
    );
  });
  await t.test('accepts a numeric timestamp as the current time', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription(),
        'course-access',
        NOW
      ),
      true
    );
  });
  await t.test('rejects invalid current-time values', () => {
    assert.equal(
      hasActiveEntitlement(
        makeSubscription(),
        'course-access',
        NaN
      ),
      false
    );
    assert.equal(
      hasActiveEntitlement(
        makeSubscription(),
        'course-access',
        'not-a-timestamp'
      ),
      false
    );
    assert.equal(
      hasActiveEntitlement(
        makeSubscription(),
        'course-access',
        Infinity
      ),
      false
    );
  });
  await t.test('uses the current time by default', () => {
    const subscription = makeSubscription({
      currentPeriodEnd: Date.now() + 60_000,
    });
    assert.equal(
      hasActiveEntitlement(subscription, 'course-access'),
      true
    );
  });
});
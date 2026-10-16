'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  actorId,
  actorRoles,
  hasRole,
  hasPermission,
  isAdmin,
  sameId,
  isOwner,
  resourceOwnerId,
  hasAnyPermission,
  safeStatus,
  denyUnless,
} = require('../../../src/policies/policy-utils');
test('actorId', async (t) => {
  await t.test('returns null for missing or invalid actors', () => {
    assert.equal(actorId(null), null);
    assert.equal(actorId(undefined), null);
    assert.equal(actorId('user-1'), null);
    assert.equal(actorId(123), null);
  });
  await t.test('supports id, userId, sub, and _id', () => {
    assert.equal(actorId({ id: 'user-1' }), 'user-1');
    assert.equal(actorId({ userId: 'user-2' }), 'user-2');
    assert.equal(actorId({ sub: 'user-3' }), 'user-3');
    assert.equal(actorId({ _id: 'user-4' }), 'user-4');
  });
  await t.test('uses the first non-nullish supported identifier', () => {
    assert.equal(
      actorId({
        id: null,
        userId: 'user-2',
        sub: 'user-3',
      }),
      'user-2'
    );
    assert.equal(
      actorId({
        id: '',
        userId: 'user-2',
      }),
      ''
    );
  });
});
test('actorRoles', async (t) => {
  await t.test('returns an empty array for missing or invalid actors', () => {
    assert.deepEqual(actorRoles(null), []);
    assert.deepEqual(actorRoles(undefined), []);
    assert.deepEqual(actorRoles('admin'), []);
  });
  await t.test('normalizes role names and aliases', () => {
    assert.deepEqual(actorRoles({ role: ' ADMIN ' }), ['admin']);
    assert.deepEqual(actorRoles({ role: 'administrator' }), ['admin']);
    assert.deepEqual(actorRoles({ role: 'super_admin' }), ['superadmin']);
    assert.deepEqual(actorRoles({ role: 'applicant' }), ['candidate']);
    assert.deepEqual(actorRoles({ role: 'counselor' }), ['counsellor']);
  });
  await t.test('combines role and roles and removes duplicates', () => {
    assert.deepEqual(
      actorRoles({
        roles: ['student', 'ADMIN', 'student'],
        role: 'admin',
      }),
      ['student', 'admin']
    );
  });
  await t.test('ignores invalid and empty role values', () => {
    assert.deepEqual(
      actorRoles({
        roles: [null, '', 123, '  ', 'employer'],
        role: null,
      }),
      ['employer']
    );
  });
});
test('hasRole', async (t) => {
  await t.test('matches normalized role names and aliases', () => {
    const actor = { role: 'administrator' };
    assert.equal(hasRole(actor, 'admin'), true);
    assert.equal(hasRole(actor, 'ADMIN'), true);
    assert.equal(hasRole(actor, 'administrator'), true);
    assert.equal(hasRole(actor, 'student'), false);
  });
  await t.test('matches any of the requested roles', () => {
    const actor = { roles: ['student', 'candidate'] };
    assert.equal(hasRole(actor, 'employer', 'candidate'), true);
    assert.equal(hasRole(actor, 'admin', 'superadmin'), false);
  });
  await t.test('returns false for missing actors or no requested roles', () => {
    assert.equal(hasRole(null, 'admin'), false);
    assert.equal(hasRole(undefined, 'admin'), false);
    assert.equal(hasRole({ role: 'admin' }), false);
    assert.equal(hasRole({ role: 'admin' }, null, ''), false);
  });
  await t.test('normalizes requested role aliases', () => {
    assert.equal(hasRole({ role: 'candidate' }, 'applicant'), true);
    assert.equal(hasRole({ role: 'superadmin' }, 'super_admin'), true);
    assert.equal(hasRole({ role: 'counsellor' }, 'counselor'), true);
  });
});
test('hasPermission', async (t) => {
  await t.test('matches exact permission strings', () => {
    const actor = {
      permissions: ['jobs:read', 'jobs:create'],
    };
    assert.equal(hasPermission(actor, 'jobs:read'), true);
    assert.equal(hasPermission(actor, 'jobs:create'), true);
    assert.equal(hasPermission(actor, 'jobs:delete'), false);
  });
  await t.test('does not trim or otherwise normalize stored permissions', () => {
    const actor = {
      permissions: [' jobs:read '],
    };
    assert.equal(hasPermission(actor, 'jobs:read'), false);
    assert.equal(hasPermission(actor, ' jobs:read '), true);
  });
  await t.test('rejects missing actors and invalid permission arguments', () => {
    assert.equal(hasPermission(null, 'jobs:read'), false);
    assert.equal(hasPermission(undefined, 'jobs:read'), false);
    assert.equal(hasPermission({}, 'jobs:read'), false);
    assert.equal(hasPermission({ permissions: ['jobs:read'] }, ''), false);
    assert.equal(hasPermission({ permissions: ['jobs:read'] }, '  '), false);
    assert.equal(hasPermission({ permissions: ['jobs:read'] }, null), false);
    assert.equal(hasPermission({ permissions: ['jobs:read'] }, 123), false);
  });
  await t.test('ignores non-string permission entries', () => {
    const actor = {
      permissions: [null, 123, {}, 'jobs:read'],
    };
    assert.equal(hasPermission(actor, 'jobs:read'), true);
    assert.equal(hasPermission(actor, '123'), false);
  });
  await t.test('grants all permissions to the trusted superadmin role', () => {
    const actor = { role: 'super_admin' };
    assert.equal(hasPermission(actor, 'jobs:read'), true);
    assert.equal(hasPermission(actor, 'payments:refund'), true);
  });
  await t.test('does not grant the superadmin bypass to ordinary admins', () => {
    const actor = { role: 'admin', permissions: [] };
    assert.equal(hasPermission(actor, 'jobs:read'), false);
  });
});
test('isAdmin', async (t) => {
  await t.test('recognizes admin and superadmin roles', () => {
    assert.equal(isAdmin({ role: 'admin' }), true);
    assert.equal(isAdmin({ role: 'administrator' }), true);
    assert.equal(isAdmin({ role: 'superadmin' }), true);
    assert.equal(isAdmin({ role: 'super_admin' }), true);
  });
  await t.test('recognizes the platform:admin permission', () => {
    assert.equal(
      isAdmin({ permissions: ['platform:admin'] }),
      true
    );
  });
  await t.test('does not treat unrelated roles or permissions as admin', () => {
    assert.equal(isAdmin({ role: 'student' }), false);
    assert.equal(isAdmin({ role: 'employer' }), false);
    assert.equal(isAdmin({ permissions: ['jobs:read'] }), false);
  });
  await t.test('handles missing or invalid actors', () => {
    assert.equal(isAdmin(null), false);
    assert.equal(isAdmin(undefined), false);
    assert.equal(isAdmin('admin'), false);
  });
});
test('sameId', async (t) => {
  await t.test('compares string and numeric identifiers consistently', () => {
    assert.equal(sameId('123', 123), true);
    assert.equal(sameId(123, '123'), true);
    assert.equal(sameId(123n, '123'), true);
  });
  await t.test('trims string identifiers', () => {
    assert.equal(sameId(' user-1 ', 'user-1'), true);
    assert.equal(sameId(' 123 ', 123), true);
  });
  await t.test('supports identifier objects with id or _id', () => {
    assert.equal(sameId({ id: 'user-1' }, 'user-1'), true);
    assert.equal(sameId({ _id: 123 }, '123'), true);
  });
  await t.test('returns false for missing or invalid identifiers', () => {
    assert.equal(sameId(null, null), false);
    assert.equal(sameId(undefined, 'user-1'), false);
    assert.equal(sameId('user-1', undefined), false);
    assert.equal(sameId('', ''), false);
    assert.equal(sameId({}, {}), false);
    assert.equal(sameId('user-1', 'user-2'), false);
  });
  await t.test('does not normalize non-finite numeric identifiers', () => {
    assert.equal(sameId(Infinity, 'Infinity'), false);
    assert.equal(sameId(NaN, 'NaN'), false);
  });
});
test('isOwner', async (t) => {
  await t.test('recognizes an actor who owns the resource', () => {
    assert.equal(isOwner({ id: 'user-1' }, 'user-1'), true);
    assert.equal(isOwner({ userId: 123 }, '123'), true);
  });
  await t.test('supports normalized identifier objects', () => {
    assert.equal(
      isOwner({ id: { _id: 'user-1' } }, { id: 'user-1' }),
      true
    );
  });
  await t.test('rejects missing actors and missing owner identifiers', () => {
    assert.equal(isOwner(null, 'user-1'), false);
    assert.equal(isOwner({}, 'user-1'), false);
    assert.equal(isOwner({ id: 'user-1' }, null), false);
    assert.equal(isOwner({ id: 'user-1' }, undefined), false);
  });
  await t.test('rejects different owners', () => {
    assert.equal(isOwner({ id: 'user-1' }, 'user-2'), false);
  });
});
test('resourceOwnerId', async (t) => {
  await t.test('uses the default owner key order', () => {
    assert.equal(
      resourceOwnerId({
        userId: 'user-1',
        ownerId: 'user-2',
        createdBy: 'user-3',
        candidateId: 'user-4',
      }),
      'user-1'
    );
  });
  await t.test('falls back to the next valid owner key', () => {
    assert.equal(
      resourceOwnerId({
        userId: null,
        ownerId: 'owner-1',
      }),
      'owner-1'
    );
    assert.equal(
      resourceOwnerId({
        userId: '',
        ownerId: null,
        createdBy: 123,
      }),
      '123'
    );
  });
  await t.test('supports custom owner key lists', () => {
    assert.equal(
      resourceOwnerId(
        {
          userId: 'user-1',
          employerId: 'employer-1',
        },
        ['employerId']
      ),
      'employer-1'
    );
  });
  await t.test('returns null for missing or invalid resources', () => {
    assert.equal(resourceOwnerId(null), null);
    assert.equal(resourceOwnerId(undefined), null);
    assert.equal(resourceOwnerId('resource'), null);
    assert.equal(resourceOwnerId([]), null);
    assert.equal(resourceOwnerId({}), null);
  });
  await t.test('rejects invalid key-list arguments', () => {
    assert.equal(resourceOwnerId({ userId: 'user-1' }, null), null);
    assert.equal(resourceOwnerId({ userId: 'user-1' }, 'userId'), null);
  });
  await t.test('ignores invalid keys and continues searching', () => {
    assert.equal(
      resourceOwnerId(
        {
          ownerId: 'owner-1',
        },
        [null, '', 123, 'ownerId']
      ),
      'owner-1'
    );
  });
});
test('hasAnyPermission', async (t) => {
  await t.test('returns true when any requested permission is granted', () => {
    const actor = {
      permissions: ['jobs:read', 'courses:read'],
    };
    assert.equal(
      hasAnyPermission(actor, ['jobs:create', 'jobs:read']),
      true
    );
  });
  await t.test('returns false when no requested permission is granted', () => {
    const actor = {
      permissions: ['jobs:read'],
    };
    assert.equal(
      hasAnyPermission(actor, ['jobs:create', 'jobs:delete']),
      false
    );
  });
  await t.test('uses the superadmin permission bypass', () => {
    assert.equal(
      hasAnyPermission(
        { role: 'superadmin' },
        ['jobs:read', 'payments:refund']
      ),
      true
    );
  });
  await t.test('returns false for invalid permission lists', () => {
    assert.equal(hasAnyPermission({ role: 'admin' }, null), false);
    assert.equal(hasAnyPermission({ role: 'admin' }, 'jobs:read'), false);
    assert.equal(hasAnyPermission({ role: 'admin' }, undefined), false);
  });
  await t.test('returns false for an empty permission list', () => {
    assert.equal(hasAnyPermission({ role: 'admin' }, []), false);
    assert.equal(hasAnyPermission({ permissions: [] }, []), false);
  });
});
test('safeStatus', async (t) => {
  await t.test('trims and lowercases string statuses', () => {
    assert.equal(safeStatus(' SUCCEEDED '), 'succeeded');
    assert.equal(safeStatus('Pending'), 'pending');
    assert.equal(safeStatus('  CANCELLED  '), 'cancelled');
  });
  await t.test('returns an empty string for non-string values', () => {
    assert.equal(safeStatus(null), '');
    assert.equal(safeStatus(undefined), '');
    assert.equal(safeStatus(123), '');
    assert.equal(safeStatus({ status: 'active' }), '');
    assert.equal(safeStatus(['active']), '');
  });
  await t.test('preserves an empty normalized status', () => {
    assert.equal(safeStatus(''), '');
    assert.equal(safeStatus('   '), '');
  });
});
test('denyUnless', async (t) => {
  await t.test('returns true only for the boolean true value', () => {
    assert.equal(denyUnless(true), true);
    assert.equal(denyUnless(false), false);
  });
  await t.test('rejects truthy values that are not exactly true', () => {
    assert.equal(denyUnless(1), false);
    assert.equal(denyUnless('true'), false);
    assert.equal(denyUnless({}), false);
    assert.equal(denyUnless([]), false);
  });
  await t.test('rejects missing values', () => {
    assert.equal(denyUnless(null), false);
    assert.equal(denyUnless(undefined), false);
  });
});
test('normalizeId behavior through public helpers', async (t) => {
  await t.test('supports finite numbers and bigint identifiers', () => {
    assert.equal(sameId(42, '42'), true);
    assert.equal(sameId(42n, '42'), true);
  });
  await t.test('supports valid MongoDB ObjectId-like values', () => {
    const objectId = {
      _bsontype: 'ObjectId',
      toHexString() {
        return 'ABCDEF0123456789ABCDEF01';
      },
    };
    assert.equal(
      sameId(objectId, 'abcdef0123456789abcdef01'),
      true
    );
  });
  await t.test('rejects malformed ObjectId-like values', () => {
    const invalidObjectId = {
      _bsontype: 'ObjectId',
      toHexString() {
        return 'not-a-valid-object-id';
      },
    };
    assert.equal(sameId(invalidObjectId, 'not-a-valid-object-id'), false);
  });
  await t.test('does not invoke arbitrary custom coercion methods', () => {
    let invoked = false;
    const unsafeIdentifier = {
      toString() {
        invoked = true;
        return 'user-1';
      },
      valueOf() {
        invoked = true;
        return 'user-1';
      },
    };
    assert.equal(sameId(unsafeIdentifier, 'user-1'), false);
    assert.equal(invoked, false);
  });
});
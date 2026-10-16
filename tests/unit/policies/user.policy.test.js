'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  userId,
  isUserOwner,
  canViewUser,
  canViewUserPrivateFields,
  canCreateUser,
  canRegisterUser,
  canUpdateUser,
  canChangeUserStatus,
  canManageUserRoles,
  canManageUserPermissions,
  canDeleteUser,
  canExportUsers,
  canViewUserActivity,
  canManageUserSessions,
  PRIVATE_PROFILE_FIELDS,
} = require('../../../src/policies/user.policy');
function makeActor(overrides = {}) {
  return {
    id: 'user-1',
    role: 'user',
    permissions: [],
    ...overrides,
  };
}
function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    role: 'user',
    status: 'active',
    deletedAt: null,
    ...overrides,
  };
}
test('userId', async (t) => {
  await t.test('returns the id field when present', () => {
    assert.equal(userId({ id: 'user-1' }), 'user-1');
  });
  await t.test('falls back to _id', () => {
    assert.equal(
      userId({ id: null, _id: 'mongo-user-1' }),
      'mongo-user-1'
    );
  });
  await t.test('falls back to userId', () => {
    assert.equal(
      userId({
        id: null,
        _id: null,
        userId: 'user-3',
      }),
      'user-3'
    );
  });
  await t.test('preserves the first non-nullish identifier', () => {
    assert.equal(
      userId({
        id: '',
        _id: 'user-2',
        userId: 'user-3',
      }),
      ''
    );
  });
  await t.test('returns null for missing identifiers', () => {
    assert.equal(userId({}), null);
    assert.equal(userId({ id: null, _id: null, userId: null }), null);
  });
  await t.test('returns null for invalid user values', () => {
    assert.equal(userId(null), null);
    assert.equal(userId(undefined), null);
    assert.equal(userId('user-1'), null);
    assert.equal(userId(123), null);
  });
});
test('isUserOwner', async (t) => {
  await t.test('recognizes the matching user', () => {
    assert.equal(
      isUserOwner(
        makeActor({ id: 'user-1' }),
        makeUser({ id: 'user-1' })
      ),
      true
    );
  });
  await t.test('supports user identifiers stored as _id or userId', () => {
    assert.equal(
      isUserOwner(
        makeActor({ id: 'user-2' }),
        makeUser({ id: null, _id: 'user-2' })
      ),
      true
    );
    assert.equal(
      isUserOwner(
        makeActor({ id: 'user-3' }),
        makeUser({
          id: null,
          _id: null,
          userId: 'user-3',
        })
      ),
      true
    );
  });
  await t.test('supports string and numeric identifier comparison', () => {
    assert.equal(
      isUserOwner(
        makeActor({ id: 123 }),
        makeUser({ id: '123' })
      ),
      true
    );
  });
  await t.test('rejects a different user', () => {
    assert.equal(
      isUserOwner(
        makeActor({ id: 'user-2' }),
        makeUser({ id: 'user-1' })
      ),
      false
    );
  });
  await t.test('rejects missing actors or users', () => {
    assert.equal(isUserOwner(null, makeUser()), false);
    assert.equal(isUserOwner(makeActor(), null), false);
    assert.equal(isUserOwner(undefined, undefined), false);
  });
  await t.test('rejects users without a usable identifier', () => {
    assert.equal(
      isUserOwner(
        makeActor(),
        makeUser({ id: null, _id: null, userId: null })
      ),
      false
    );
  });
});
test('canViewUser', async (t) => {
  await t.test('allows users to view their own profile', () => {
    assert.equal(
      canViewUser(
        makeActor(),
        makeUser()
      ),
      true
    );
  });
  await t.test('denies users access to another private profile', () => {
    assert.equal(
      canViewUser(
        makeActor({ id: 'user-2' }),
        makeUser({ id: 'user-1' })
      ),
      false
    );
  });
  await t.test('allows admins to view other users', () => {
    assert.equal(
      canViewUser(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser({ id: 'user-1' })
      ),
      true
    );
  });
  await t.test('allows users:read:any permission holders', () => {
    assert.equal(
      canViewUser(
        makeActor({
          id: 'user-2',
          permissions: ['users:read:any'],
        }),
        makeUser({ id: 'user-1' })
      ),
      true
    );
  });
  await t.test('denies access to deleted users', () => {
    assert.equal(
      canViewUser(
        makeActor({ role: 'admin' }),
        makeUser({ status: 'deleted' })
      ),
      false
    );
    assert.equal(
      canViewUser(
        makeActor({
          permissions: ['users:read:any'],
        }),
        makeUser({ deletedAt: '2026-10-01T00:00:00.000Z' })
      ),
      false
    );
  });
  await t.test('normalizes status before checking deletion', () => {
    assert.equal(
      canViewUser(
        makeActor({ role: 'admin' }),
        makeUser({ status: ' DELETED ' })
      ),
      false
    );
    assert.equal(
      canViewUser(
        makeActor(),
        makeUser({ status: ' ACTIVE ' })
      ),
      true
    );
  });
  await t.test('rejects missing or invalid arguments', () => {
    assert.equal(canViewUser(null, makeUser()), false);
    assert.equal(canViewUser(makeActor(), null), false);
    assert.equal(canViewUser(makeActor(), undefined), false);
    assert.equal(canViewUser(makeActor(), 'user'), false);
    assert.equal(canViewUser(makeActor(), 123), false);
  });
});
test('canViewUserPrivateFields', async (t) => {
  await t.test('allows owners to view private fields', () => {
    assert.equal(
      canViewUserPrivateFields(
        makeActor(),
        makeUser()
      ),
      true
    );
  });
  await t.test('allows admins to view private fields', () => {
    assert.equal(
      canViewUserPrivateFields(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser()
      ),
      true
    );
  });
  await t.test('allows users:read:private permission holders', () => {
    assert.equal(
      canViewUserPrivateFields(
        makeActor({
          id: 'user-2',
          permissions: ['users:read:private'],
        }),
        makeUser()
      ),
      true
    );
  });
  await t.test('does not grant private access from users:read:any alone', () => {
    assert.equal(
      canViewUserPrivateFields(
        makeActor({
          id: 'user-2',
          permissions: ['users:read:any'],
        }),
        makeUser()
      ),
      false
    );
  });
  await t.test('denies access to deleted users even for admins', () => {
    assert.equal(
      canViewUserPrivateFields(
        makeActor({ role: 'admin' }),
        makeUser({ status: 'deleted' })
      ),
      false
    );
    assert.equal(
      canViewUserPrivateFields(
        makeActor({ role: 'admin' }),
        makeUser({ deletedAt: '2026-10-01T00:00:00.000Z' })
      ),
      false
    );
  });
  await t.test('rejects missing or invalid arguments', () => {
    assert.equal(canViewUserPrivateFields(null, makeUser()), false);
    assert.equal(canViewUserPrivateFields(makeActor(), null), false);
    assert.equal(canViewUserPrivateFields(makeActor(), 'user'), false);
  });
});
test('PRIVATE_PROFILE_FIELDS', async (t) => {
  await t.test('contains the expected private profile fields', () => {
    for (const field of [
      'email',
      'phone',
      'dateOfBirth',
      'address',
      'documents',
      'identityDocuments',
    ]) {
      assert.equal(
        PRIVATE_PROFILE_FIELDS.has(field),
        true,
        `Expected private field: ${field}`
      );
    }
  });
  await t.test('does not classify ordinary public profile fields as private', () => {
    for (const field of [
      'name',
      'bio',
      'avatar',
      'website',
    ]) {
      assert.equal(
        PRIVATE_PROFILE_FIELDS.has(field),
        false,
        `Unexpected private field: ${field}`
      );
    }
  });
  await t.test('is a Set', () => {
    assert.equal(PRIVATE_PROFILE_FIELDS instanceof Set, true);
  });
});
test('canCreateUser', async (t) => {
  await t.test('allows admins to create users', () => {
    assert.equal(
      canCreateUser(makeActor({ role: 'admin' })),
      true
    );
  });
  await t.test('allows users:create:any permission holders', () => {
    assert.equal(
      canCreateUser(
        makeActor({
          permissions: ['users:create:any'],
        })
      ),
      true
    );
  });
  await t.test('denies actors without create permission', () => {
    assert.equal(canCreateUser(makeActor()), false);
    assert.equal(
      canCreateUser(
        makeActor({
          permissions: ['users:read:any'],
        })
      ),
      false
    );
  });
  await t.test('rejects missing actors', () => {
    assert.equal(canCreateUser(null), false);
    assert.equal(canCreateUser(undefined), false);
  });
  await t.test('rejects invalid input values', () => {
    assert.equal(canCreateUser(makeActor(), null), false);
    assert.equal(canCreateUser(makeActor(), []), false);
    assert.equal(canCreateUser(makeActor(), 'user'), false);
  });
  await t.test('allows a valid input object only for privileged actors', () => {
    const input = { name: 'New User' };
    assert.equal(canCreateUser(makeActor(), input), false);
    assert.equal(
      canCreateUser(
        makeActor({ role: 'admin' }),
        input
      ),
      true
    );
  });
  await t.test('does not grant authorization from input fields', () => {
    assert.equal(
      canCreateUser(
        makeActor(),
        {
          role: 'admin',
          permissions: ['users:create:any'],
          isAdmin: true,
        }
      ),
      false
    );
  });
});
test('canRegisterUser', async (t) => {
  await t.test('allows public registration with ordinary profile fields', () => {
    assert.equal(
      canRegisterUser({
        name: 'New User',
        email: 'new@example.com',
        password: 'example-password',
      }),
      true
    );
  });
  await t.test('allows registration with an empty object', () => {
    assert.equal(canRegisterUser({}), true);
  });
  await t.test('rejects missing or invalid input values', () => {
    assert.equal(canRegisterUser(null), false);
    assert.equal(canRegisterUser(undefined), false);
    assert.equal(canRegisterUser([]), false);
    assert.equal(canRegisterUser('user'), false);
    assert.equal(canRegisterUser(123), false);
  });
  await t.test('rejects caller-supplied role fields', () => {
    for (const field of ['role', 'roles']) {
      assert.equal(
        canRegisterUser({ name: 'New User', [field]: 'admin' }),
        false,
        `Expected registration to reject ${field}`
      );
    }
  });
  await t.test('rejects caller-supplied permissions', () => {
    assert.equal(
      canRegisterUser({
        name: 'New User',
        permissions: ['users:read:any'],
      }),
      false
    );
  });
  await t.test('rejects caller-supplied status', () => {
    for (const field of [
      'status',
      'isAdmin',
      'isVerified',
      'isSuspended',
      'isDisabled',
    ]) {
      assert.equal(
        canRegisterUser({
          name: 'New User',
          [field]: field === 'status' ? 'active' : true,
        }),
        false,
        `Expected registration to reject ${field}`
      );
    }
  });
  await t.test('rejects protected fields even when their values are null', () => {
    for (const field of [
      'role',
      'roles',
      'permissions',
      'status',
      'isAdmin',
      'isVerified',
      'isSuspended',
      'isDisabled',
    ]) {
      assert.equal(
        canRegisterUser({ [field]: null }),
        false,
        `Expected registration to reject the presence of ${field}`
      );
    }
  });
});
test('canUpdateUser', async (t) => {
  await t.test('allows an owner to update ordinary profile fields', () => {
    assert.equal(
      canUpdateUser(
        makeActor(),
        makeUser(),
        { name: 'Updated Name' }
      ),
      true
    );
    assert.equal(
      canUpdateUser(
        makeActor(),
        makeUser(),
        { bio: 'Updated biography', avatar: 'avatar.webp' }
      ),
      true
    );
  });
  await t.test('allows an owner to submit an empty changes object', () => {
    assert.equal(
      canUpdateUser(makeActor(), makeUser(), {}),
      true
    );
  });
  await t.test('rejects updates by non-owners', () => {
    assert.equal(
      canUpdateUser(
        makeActor({ id: 'user-2' }),
        makeUser(),
        { name: 'Unauthorized' }
      ),
      false
    );
  });
  await t.test('allows admins to update users they do not own', () => {
    assert.equal(
      canUpdateUser(
        makeActor({ role: 'admin' }),
        makeUser(),
        { role: 'student' }
      ),
      true
    );
  });
  await t.test('allows users:update:any permission holders', () => {
    assert.equal(
      canUpdateUser(
        makeActor({
          id: 'user-2',
          permissions: ['users:update:any'],
        }),
        makeUser(),
        { status: 'disabled' }
      ),
      true
    );
  });
  await t.test('rejects owner updates for disabled accounts', () => {
    for (const status of [
      'suspended',
      'disabled',
      'locked',
      'deleted',
      'banned',
    ]) {
      assert.equal(
        canUpdateUser(
          makeActor(),
          makeUser({ status }),
          { name: 'Updated Name' }
        ),
        false,
        `Expected owner update to be denied for status: ${status}`
      );
    }
  });
  await t.test('normalizes status before checking disabled states', () => {
    assert.equal(
      canUpdateUser(
        makeActor(),
        makeUser({ status: ' SUSPENDED ' }),
        { name: 'Updated Name' }
      ),
      false
    );
  });
  await t.test('rejects owner updates when deletedAt is set', () => {
    assert.equal(
      canUpdateUser(
        makeActor(),
        makeUser({ deletedAt: '2026-10-01T00:00:00.000Z' }),
        { name: 'Updated Name' }
      ),
      false
    );
  });
  await t.test('rejects changes to protected identity and authorization fields', () => {
    const protectedFields = [
      'id',
      '_id',
      'userId',
      'role',
      'roles',
      'permissions',
      'status',
      'isAdmin',
      'isVerified',
      'isSuspended',
      'isDisabled',
      'isLocked',
      'emailVerified',
      'emailVerifiedAt',
      'verifiedAt',
      'password',
      'passwordHash',
      'passwordResetToken',
      'passwordResetExpiresAt',
      'verificationToken',
      'verificationTokenHash',
      'refreshToken',
      'refreshTokenHash',
      'mfaSecret',
      'recoveryCodes',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ];
    for (const field of protectedFields) {
      assert.equal(
        canUpdateUser(
          makeActor(),
          makeUser(),
          { [field]: 'tampered-value' }
        ),
        false,
        `Expected protected field to be rejected: ${field}`
      );
    }
  });
  await t.test('rejects invalid change objects', () => {
    assert.equal(canUpdateUser(null, makeUser(), {}), false);
    assert.equal(canUpdateUser(makeActor(), null, {}), false);
    assert.equal(canUpdateUser(makeActor(), makeUser(), null), false);
    assert.equal(canUpdateUser(makeActor(), makeUser(), []), false);
    assert.equal(canUpdateUser(makeActor(), makeUser(), 'name'), false);
    assert.equal(canUpdateUser(makeActor(), makeUser(), 123), false);
  });
  await t.test('privileged update bypasses owner field restrictions', () => {
    assert.equal(
      canUpdateUser(
        makeActor({ role: 'admin' }),
        makeUser(),
        {
          role: 'admin',
          permissions: ['users:read:any'],
          status: 'active',
        }
      ),
      true
    );
  });
});
test('canChangeUserStatus', async (t) => {
  await t.test('allows admins to change another user status', () => {
    assert.equal(
      canChangeUserStatus(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser(),
        'suspended'
      ),
      true
    );
  });
  await t.test('allows users:status:update permission holders', () => {
    assert.equal(
      canChangeUserStatus(
        makeActor({
          id: 'admin-1',
          permissions: ['users:status:update'],
        }),
        makeUser(),
        'disabled'
      ),
      true
    );
  });
  await t.test('denies actors without status-update permission', () => {
    assert.equal(
      canChangeUserStatus(
        makeActor({ id: 'admin-1' }),
        makeUser(),
        'suspended'
      ),
      false
    );
  });
  await t.test('prevents users from changing their own status', () => {
    assert.equal(
      canChangeUserStatus(
        makeActor({ role: 'admin' }),
        makeUser(),
        'suspended'
      ),
      false
    );
    assert.equal(
      canChangeUserStatus(
        makeActor({
          permissions: ['users:status:update'],
        }),
        makeUser(),
        'disabled'
      ),
      false
    );
  });
  await t.test('rejects missing actors or users', () => {
    assert.equal(canChangeUserStatus(null, makeUser(), 'active'), false);
    assert.equal(canChangeUserStatus(makeActor(), null, 'active'), false);
  });
  await t.test('rejects empty or non-string statuses', () => {
    for (const status of ['', '   ', null, undefined, 123, {}, []]) {
      assert.equal(
        canChangeUserStatus(
          makeActor({ role: 'admin', id: 'admin-1' }),
          makeUser(),
          status
        ),
        false
      );
    }
  });
  await t.test('accepts non-empty string status values', () => {
    assert.equal(
      canChangeUserStatus(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser(),
        'active'
      ),
      true
    );
    assert.equal(
      canChangeUserStatus(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser(),
        'custom-status'
      ),
      true
    );
  });
});
test('canManageUserRoles', async (t) => {
  await t.test('allows admins to manage another user roles', () => {
    assert.equal(
      canManageUserRoles(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser()
      ),
      true
    );
  });
  await t.test('allows users:roles:manage permission holders', () => {
    assert.equal(
      canManageUserRoles(
        makeActor({
          id: 'admin-1',
          permissions: ['users:roles:manage'],
        }),
        makeUser()
      ),
      true
    );
  });
  await t.test('denies actors without role-management permission', () => {
    assert.equal(
      canManageUserRoles(
        makeActor({ id: 'admin-1' }),
        makeUser()
      ),
      false
    );
  });
  await t.test('prevents self-role management', () => {
    assert.equal(
      canManageUserRoles(
        makeActor({ role: 'admin' }),
        makeUser()
      ),
      false
    );
    assert.equal(
      canManageUserRoles(
        makeActor({
          permissions: ['users:roles:manage'],
        }),
        makeUser()
      ),
      false
    );
  });
  await t.test('rejects missing actors or users', () => {
    assert.equal(canManageUserRoles(null, makeUser()), false);
    assert.equal(canManageUserRoles(makeActor(), null), false);
  });
});
test('canManageUserPermissions', async (t) => {
  await t.test('allows admins to manage another user permissions', () => {
    assert.equal(
      canManageUserPermissions(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser()
      ),
      true
    );
  });
  await t.test('allows users:permissions:manage permission holders', () => {
    assert.equal(
      canManageUserPermissions(
        makeActor({
          id: 'admin-1',
          permissions: ['users:permissions:manage'],
        }),
        makeUser()
      ),
      true
    );
  });
  await t.test('denies actors without permission-management permission', () => {
    assert.equal(
      canManageUserPermissions(
        makeActor({ id: 'admin-1' }),
        makeUser()
      ),
      false
    );
  });
  await t.test('prevents users from managing their own permissions', () => {
    assert.equal(
      canManageUserPermissions(
        makeActor({ role: 'admin' }),
        makeUser()
      ),
      false
    );
    assert.equal(
      canManageUserPermissions(
        makeActor({
          permissions: ['users:permissions:manage'],
        }),
        makeUser()
      ),
      false
    );
  });
  await t.test('rejects missing actors or users', () => {
    assert.equal(canManageUserPermissions(null, makeUser()), false);
    assert.equal(canManageUserPermissions(makeActor(), null), false);
  });
});
test('canDeleteUser', async (t) => {
  await t.test('allows self-deletion with users:delete:self permission', () => {
    assert.equal(
      canDeleteUser(
        makeActor({
          permissions: ['users:delete:self'],
        }),
        makeUser()
      ),
      true
    );
  });
  await t.test('denies self-deletion without the required permission', () => {
    assert.equal(
      canDeleteUser(
        makeActor(),
        makeUser()
      ),
      false
    );
  });
  await t.test('allows admins to delete other users', () => {
    assert.equal(
      canDeleteUser(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser()
      ),
      true
    );
  });
  await t.test('allows users:delete:any permission holders', () => {
    assert.equal(
      canDeleteUser(
        makeActor({
          id: 'admin-1',
          permissions: ['users:delete:any'],
        }),
        makeUser()
      ),
      true
    );
  });
  await t.test('denies deletion without the required permission', () => {
    assert.equal(
      canDeleteUser(
        makeActor({ id: 'admin-1' }),
        makeUser()
      ),
      false
    );
  });
  await t.test('rejects deletion of already-deleted users', () => {
    assert.equal(
      canDeleteUser(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser({ status: 'deleted' })
      ),
      false
    );
    assert.equal(
      canDeleteUser(
        makeActor({
          permissions: ['users:delete:self'],
        }),
        makeUser({ deletedAt: '2026-10-01T00:00:00.000Z' })
      ),
      false
    );
  });
  await t.test('normalizes status before checking deletion', () => {
    assert.equal(
      canDeleteUser(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser({ status: ' DELETED ' })
      ),
      false
    );
  });
  await t.test('rejects missing actors or users', () => {
    assert.equal(canDeleteUser(null, makeUser()), false);
    assert.equal(canDeleteUser(makeActor(), null), false);
  });
});
test('canExportUsers', async (t) => {
  await t.test('allows admins to export users', () => {
    assert.equal(
      canExportUsers(makeActor({ role: 'admin' })),
      true
    );
  });
  await t.test('allows users:export permission holders', () => {
    assert.equal(
      canExportUsers(
        makeActor({
          permissions: ['users:export'],
        })
      ),
      true
    );
  });
  await t.test('denies actors without export permission', () => {
    assert.equal(canExportUsers(makeActor()), false);
    assert.equal(
      canExportUsers(
        makeActor({
          permissions: ['users:read:any'],
        })
      ),
      false
    );
  });
  await t.test('rejects missing actors', () => {
    assert.equal(canExportUsers(null), false);
    assert.equal(canExportUsers(undefined), false);
  });
});
test('canViewUserActivity', async (t) => {
  await t.test('allows users to view their own activity', () => {
    assert.equal(
      canViewUserActivity(makeActor(), makeUser()),
      true
    );
  });
  await t.test('allows admins to view another user activity', () => {
    assert.equal(
      canViewUserActivity(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser()
      ),
      true
    );
  });
  await t.test('allows users:activity:read:any permission holders', () => {
    assert.equal(
      canViewUserActivity(
        makeActor({
          id: 'user-2',
          permissions: ['users:activity:read:any'],
        }),
        makeUser()
      ),
      true
    );
  });
  await t.test('denies unauthorized activity access', () => {
    assert.equal(
      canViewUserActivity(
        makeActor({ id: 'user-2' }),
        makeUser()
      ),
      false
    );
  });
  await t.test('rejects missing actors or users', () => {
    assert.equal(canViewUserActivity(null, makeUser()), false);
    assert.equal(canViewUserActivity(makeActor(), null), false);
  });
  await t.test('does not automatically deny activity access for deleted users', () => {
    assert.equal(
      canViewUserActivity(
        makeActor(),
        makeUser({ status: 'deleted' })
      ),
      true
    );
    assert.equal(
      canViewUserActivity(
        makeActor({ role: 'admin', id: 'admin-1' }),
        makeUser({ deletedAt: '2026-10-01T00:00:00.000Z' })
      ),
      true
    );
  });
});
test('canManageUserSessions', async (t) => {
  await t.test('allows users to manage their own sessions', () => {
    assert.equal(
      canManageUserSessions(
        makeActor({ id: 'user-1' }),
        'user-1'
      ),
      true
    );
  });
  await t.test('supports equivalent numeric and string identifiers', () => {
    assert.equal(
      canManageUserSessions(
        makeActor({ id: 123 }),
        '123'
      ),
      true
    );
  });
  await t.test('allows admins to manage another user sessions', () => {
    assert.equal(
      canManageUserSessions(
        makeActor({ role: 'admin', id: 'admin-1' }),
        'user-1'
      ),
      true
    );
  });
  await t.test('allows auth:sessions:manage:any permission holders', () => {
    assert.equal(
      canManageUserSessions(
        makeActor({
          id: 'admin-1',
          permissions: ['auth:sessions:manage:any'],
        }),
        'user-1'
      ),
      true
    );
  });
  await t.test('denies unauthorized cross-user session management', () => {
    assert.equal(
      canManageUserSessions(
        makeActor({ id: 'user-2' }),
        'user-1'
      ),
      false
    );
  });
  await t.test('rejects missing actors or target identifiers', () => {
    assert.equal(canManageUserSessions(null, 'user-1'), false);
    assert.equal(canManageUserSessions(undefined, 'user-1'), false);
    assert.equal(canManageUserSessions(makeActor(), null), false);
    assert.equal(canManageUserSessions(makeActor(), undefined), false);
    assert.equal(canManageUserSessions(makeActor(), ''), false);
  });
  await t.test('does not treat whitespace as an empty target identifier', () => {
    assert.equal(
      canManageUserSessions(
        makeActor({ id: 'user-1' }),
        '   '
      ),
      false
    );
  });
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canAuthenticate,
  canAccessAuthenticatedResources,
  canManageAccount,
  canViewAuthAccount,
  canChangeAccountStatus,
  sessionOwnerId,
  canManageSession,
  canRevokeSession,
  canRevokeAllSessions,
  canChangeOwnPassword,
  canRequestPasswordReset,
  canResetAnotherUserPassword,
  canManageAuthConfiguration,
  canUsePrivilegedAuthOperations,
} = require('../../../src/policies/auth.policy');

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function makeActor(overrides = {}) {
  return {
    id: 'USER-101',
    role: 'user',
    status: 'active',
    permissions: [],
    ...overrides,
  };
}

function makeAdmin(overrides = {}) {
  return makeActor({
    id: 'ADMIN-101',
    role: 'admin',
    status: 'active',
    ...overrides,
  });
}

function makeSession(overrides = {}) {
  return {
    id: 'SESSION-101',
    userId: 'USER-101',
    revokedAt: null,
    revoked: false,
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// canAuthenticate
// -----------------------------------------------------------------------------

test('canAuthenticate permits an active account', () => {
  assert.equal(
    canAuthenticate({ status: 'active' }),
    true,
  );
});

test('canAuthenticate permits a verified account', () => {
  assert.equal(
    canAuthenticate({ status: 'verified' }),
    true,
  );
});

test('canAuthenticate permits an account without an explicit status', () => {
  assert.equal(
    canAuthenticate({ id: 'USER-101' }),
    true,
  );
});

test('canAuthenticate permits an account with an unrecognized non-disabled status', () => {
  assert.equal(
    canAuthenticate({ status: 'reviewed' }),
    true,
  );
});

test('canAuthenticate rejects a missing account', () => {
  assert.equal(canAuthenticate(null), false);
  assert.equal(canAuthenticate(undefined), false);
});

test('canAuthenticate rejects a non-object account', () => {
  assert.equal(canAuthenticate('USER-101'), false);
  assert.equal(canAuthenticate(101), false);
});

test('canAuthenticate rejects an explicitly disabled account', () => {
  assert.equal(
    canAuthenticate({ isDisabled: true }),
    false,
  );
});

test('canAuthenticate rejects an explicitly suspended account', () => {
  assert.equal(
    canAuthenticate({ isSuspended: true }),
    false,
  );
});

test('canAuthenticate rejects an explicitly locked account', () => {
  assert.equal(
    canAuthenticate({ isLocked: true }),
    false,
  );
});

test('canAuthenticate rejects an account with a deletion timestamp', () => {
  assert.equal(
    canAuthenticate({ deletedAt: '2026-01-01T00:00:00.000Z' }),
    false,
  );
});

test('canAuthenticate rejects disabled status', () => {
  assert.equal(
    canAuthenticate({ status: 'disabled' }),
    false,
  );
});

test('canAuthenticate rejects suspended status', () => {
  assert.equal(
    canAuthenticate({ status: 'suspended' }),
    false,
  );
});

test('canAuthenticate rejects locked status', () => {
  assert.equal(
    canAuthenticate({ status: 'locked' }),
    false,
  );
});

test('canAuthenticate rejects deleted status', () => {
  assert.equal(
    canAuthenticate({ status: 'deleted' }),
    false,
  );
});

test('canAuthenticate rejects banned status', () => {
  assert.equal(
    canAuthenticate({ status: 'banned' }),
    false,
  );
});

test('canAuthenticate rejects pending verification', () => {
  assert.equal(
    canAuthenticate({ status: 'pending_verification' }),
    false,
  );
});

test('canAuthenticate rejects unverified accounts', () => {
  assert.equal(
    canAuthenticate({ status: 'unverified' }),
    false,
  );
});

test('canAuthenticate normalizes status casing', () => {
  assert.equal(
    canAuthenticate({ status: 'DISABLED' }),
    false,
  );

  assert.equal(
    canAuthenticate({ status: 'ACTIVE' }),
    true,
  );
});

test('canAuthenticate normalizes status whitespace', () => {
  assert.equal(
    canAuthenticate({ status: ' suspended ' }),
    false,
  );

  assert.equal(
    canAuthenticate({ status: ' active ' }),
    true,
  );
});

test('canAuthenticate rejects an account with deletedAt set to an empty string only when non-null', () => {
  assert.equal(
    canAuthenticate({ status: 'active', deletedAt: '' }),
    false,
  );
});

test('canAuthenticate does not mutate the account', () => {
  const account = {
    id: 'USER-101',
    status: ' ACTIVE ',
  };

  const original = { ...account };

  canAuthenticate(account);

  assert.deepEqual(account, original);
});

// -----------------------------------------------------------------------------
// canAccessAuthenticatedResources
// -----------------------------------------------------------------------------

test('canAccessAuthenticatedResources permits an active actor', () => {
  assert.equal(
    canAccessAuthenticatedResources(makeActor()),
    true,
  );
});

test('canAccessAuthenticatedResources permits an actor without an explicit status', () => {
  assert.equal(
    canAccessAuthenticatedResources({
      id: 'USER-101',
      role: 'user',
    }),
    true,
  );
});

test('canAccessAuthenticatedResources rejects a missing actor', () => {
  assert.equal(
    canAccessAuthenticatedResources(null),
    false,
  );

  assert.equal(
    canAccessAuthenticatedResources(undefined),
    false,
  );
});

test('canAccessAuthenticatedResources rejects non-object actors', () => {
  assert.equal(
    canAccessAuthenticatedResources('USER-101'),
    false,
  );

  assert.equal(
    canAccessAuthenticatedResources(101),
    false,
  );
});

test('canAccessAuthenticatedResources rejects disabled actors', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ isDisabled: true }),
    ),
    false,
  );
});

test('canAccessAuthenticatedResources rejects suspended actors', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ isSuspended: true }),
    ),
    false,
  );
});

test('canAccessAuthenticatedResources rejects locked actors', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ isLocked: true }),
    ),
    false,
  );
});

test('canAccessAuthenticatedResources rejects deleted actors', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ deletedAt: '2026-01-01T00:00:00.000Z' }),
    ),
    false,
  );
});

test('canAccessAuthenticatedResources rejects disabled status', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ status: 'disabled' }),
    ),
    false,
  );
});

test('canAccessAuthenticatedResources rejects suspended status', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ status: 'suspended' }),
    ),
    false,
  );
});

test('canAccessAuthenticatedResources rejects locked status', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ status: 'locked' }),
    ),
    false,
  );
});

test('canAccessAuthenticatedResources rejects deleted status', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ status: 'deleted' }),
    ),
    false,
  );
});

test('canAccessAuthenticatedResources rejects banned status', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ status: 'banned' }),
    ),
    false,
  );
});

test('canAccessAuthenticatedResources normalizes status casing and whitespace', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ status: ' LOCKED ' }),
    ),
    false,
  );

  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ status: ' ACTIVE ' }),
    ),
    true,
  );
});

test('canAccessAuthenticatedResources does not reject pending verification solely because of that status', () => {
  assert.equal(
    canAccessAuthenticatedResources(
      makeActor({ status: 'pending_verification' }),
    ),
    true,
  );
});

// -----------------------------------------------------------------------------
// canManageAccount
// -----------------------------------------------------------------------------

test('canManageAccount permits a user to manage their own account', () => {
  assert.equal(
    canManageAccount(makeActor(), 'USER-101'),
    true,
  );
});

test('canManageAccount permits an administrator to manage another account', () => {
  assert.equal(
    canManageAccount(makeAdmin(), 'USER-202'),
    true,
  );
});

test('canManageAccount permits users:manage:any permission', () => {
  assert.equal(
    canManageAccount(
      makeActor({
        permissions: ['users:manage:any'],
      }),
      'USER-202',
    ),
    true,
  );
});

test('canManageAccount denies an ordinary user managing another account', () => {
  assert.equal(
    canManageAccount(makeActor(), 'USER-202'),
    false,
  );
});

test('canManageAccount rejects a missing actor', () => {
  assert.equal(
    canManageAccount(null, 'USER-101'),
    false,
  );
});

test('canManageAccount rejects a missing target ID', () => {
  assert.equal(
    canManageAccount(makeActor(), null),
    false,
  );

  assert.equal(
    canManageAccount(makeActor(), undefined),
    false,
  );

  assert.equal(
    canManageAccount(makeActor(), ''),
    false,
  );
});

test('canManageAccount compares numeric and string identifiers', () => {
  assert.equal(
    canManageAccount(
      makeActor({ id: 101 }),
      '101',
    ),
    true,
  );
});

test('canManageAccount supports actor userId identity', () => {
  assert.equal(
    canManageAccount(
      makeActor({
        id: undefined,
        userId: 'USER-101',
      }),
      'USER-101',
    ),
    true,
  );
});

test('canManageAccount supports actor sub identity', () => {
  assert.equal(
    canManageAccount(
      makeActor({
        id: undefined,
        sub: 'USER-101',
      }),
      'USER-101',
    ),
    true,
  );
});

// -----------------------------------------------------------------------------
// canViewAuthAccount
// -----------------------------------------------------------------------------

test('canViewAuthAccount permits viewing the current user account', () => {
  assert.equal(
    canViewAuthAccount(makeActor(), 'USER-101'),
    true,
  );
});

test('canViewAuthAccount permits administrators to view another account', () => {
  assert.equal(
    canViewAuthAccount(makeAdmin(), 'USER-202'),
    true,
  );
});

test('canViewAuthAccount permits auth:accounts:read:any permission', () => {
  assert.equal(
    canViewAuthAccount(
      makeActor({
        permissions: ['auth:accounts:read:any'],
      }),
      'USER-202',
    ),
    true,
  );
});

test('canViewAuthAccount denies an ordinary user viewing another account', () => {
  assert.equal(
    canViewAuthAccount(makeActor(), 'USER-202'),
    false,
  );
});

test('canViewAuthAccount rejects a missing actor', () => {
  assert.equal(
    canViewAuthAccount(null, 'USER-101'),
    false,
  );
});

test('canViewAuthAccount rejects an empty target ID', () => {
  assert.equal(
    canViewAuthAccount(makeActor(), ''),
    false,
  );
});

test('canViewAuthAccount rejects a null target ID', () => {
  assert.equal(
    canViewAuthAccount(makeActor(), null),
    false,
  );
});

test('canViewAuthAccount supports alternate actor identity fields', () => {
  assert.equal(
    canViewAuthAccount(
      makeActor({
        id: undefined,
        userId: 'USER-101',
      }),
      'USER-101',
    ),
    true,
  );

  assert.equal(
    canViewAuthAccount(
      makeActor({
        id: undefined,
        sub: 'USER-101',
      }),
      'USER-101',
    ),
    true,
  );
});

// -----------------------------------------------------------------------------
// canChangeAccountStatus
// -----------------------------------------------------------------------------

test('canChangeAccountStatus permits an administrator to change another account status', () => {
  assert.equal(
    canChangeAccountStatus(makeAdmin(), 'USER-202'),
    true,
  );
});

test('canChangeAccountStatus permits auth:accounts:status:update permission', () => {
  assert.equal(
    canChangeAccountStatus(
      makeActor({
        permissions: ['auth:accounts:status:update'],
      }),
      'USER-202',
    ),
    true,
  );
});

test('canChangeAccountStatus denies an ordinary user changing another account', () => {
  assert.equal(
    canChangeAccountStatus(makeActor(), 'USER-202'),
    false,
  );
});

test('canChangeAccountStatus denies self-status changes by an ordinary user', () => {
  assert.equal(
    canChangeAccountStatus(makeActor(), 'USER-101'),
    false,
  );
});

test('canChangeAccountStatus denies self-status changes even with permission', () => {
  assert.equal(
    canChangeAccountStatus(
      makeActor({
        permissions: ['auth:accounts:status:update'],
      }),
      'USER-101',
    ),
    false,
  );
});

test('canChangeAccountStatus denies an administrator changing their own status', () => {
  assert.equal(
    canChangeAccountStatus(makeAdmin(), 'ADMIN-101'),
    false,
  );
});

test('canChangeAccountStatus rejects a missing actor', () => {
  assert.equal(
    canChangeAccountStatus(null, 'USER-202'),
    false,
  );
});

test('canChangeAccountStatus rejects a missing target ID', () => {
  assert.equal(
    canChangeAccountStatus(makeAdmin(), null),
    false,
  );

  assert.equal(
    canChangeAccountStatus(makeAdmin(), ''),
    false,
  );
});

// -----------------------------------------------------------------------------
// sessionOwnerId
// -----------------------------------------------------------------------------

test('sessionOwnerId resolves userId', () => {
  assert.equal(
    sessionOwnerId({ userId: 'USER-101' }),
    'USER-101',
  );
});

test('sessionOwnerId resolves ownerId when userId is absent', () => {
  assert.equal(
    sessionOwnerId({ ownerId: 'USER-202' }),
    'USER-202',
  );
});

test('sessionOwnerId resolves accountId when earlier fields are absent', () => {
  assert.equal(
    sessionOwnerId({ accountId: 'USER-303' }),
    'USER-303',
  );
});

test('sessionOwnerId prioritizes userId', () => {
  assert.equal(
    sessionOwnerId({
      userId: 'USER-101',
      ownerId: 'USER-202',
      accountId: 'USER-303',
    }),
    'USER-101',
  );
});

test('sessionOwnerId falls back to ownerId', () => {
  assert.equal(
    sessionOwnerId({
      userId: null,
      ownerId: 'USER-202',
      accountId: 'USER-303',
    }),
    'USER-202',
  );
});

test('sessionOwnerId falls back to accountId', () => {
  assert.equal(
    sessionOwnerId({
      userId: null,
      ownerId: '',
      accountId: 'USER-303',
    }),
    'USER-303',
  );
});

test('sessionOwnerId returns null for a missing session', () => {
  assert.equal(sessionOwnerId(null), null);
  assert.equal(sessionOwnerId(undefined), null);
});

test('sessionOwnerId returns null for a primitive', () => {
  assert.equal(sessionOwnerId('SESSION-101'), null);
});

test('sessionOwnerId returns null when no owner field exists', () => {
  assert.equal(
    sessionOwnerId({ id: 'SESSION-101' }),
    null,
  );
});

test('sessionOwnerId ignores empty owner fields', () => {
  assert.equal(
    sessionOwnerId({
      userId: '',
      ownerId: '',
      accountId: '',
    }),
    null,
  );
});

// -----------------------------------------------------------------------------
// canManageSession
// -----------------------------------------------------------------------------

test('canManageSession permits the session owner', () => {
  assert.equal(
    canManageSession(
      makeActor(),
      makeSession(),
    ),
    true,
  );
});

test('canManageSession permits an administrator to manage an active session', () => {
  assert.equal(
    canManageSession(
      makeAdmin(),
      makeSession({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canManageSession permits auth:sessions:manage:any permission', () => {
  assert.equal(
    canManageSession(
      makeActor({
        permissions: ['auth:sessions:manage:any'],
      }),
      makeSession({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canManageSession denies an unrelated user', () => {
  assert.equal(
    canManageSession(
      makeActor({ id: 'USER-202' }),
      makeSession(),
    ),
    false,
  );
});

test('canManageSession denies a revoked session', () => {
  assert.equal(
    canManageSession(
      makeActor(),
      makeSession({ revoked: true }),
    ),
    false,
  );
});

test('canManageSession denies a session with revokedAt set', () => {
  assert.equal(
    canManageSession(
      makeActor(),
      makeSession({
        revokedAt: '2026-01-01T00:00:00.000Z',
      }),
    ),
    false,
  );
});

test('canManageSession rejects a missing actor', () => {
  assert.equal(
    canManageSession(null, makeSession()),
    false,
  );
});

test('canManageSession rejects a missing session', () => {
  assert.equal(
    canManageSession(makeActor(), null),
    false,
  );
});

test('canManageSession rejects a primitive session', () => {
  assert.equal(
    canManageSession(makeActor(), 'SESSION-101'),
    false,
  );
});

test('canManageSession supports ownerId session ownership', () => {
  assert.equal(
    canManageSession(
      makeActor(),
      makeSession({
        userId: undefined,
        ownerId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canManageSession supports accountId session ownership', () => {
  assert.equal(
    canManageSession(
      makeActor(),
      makeSession({
        userId: undefined,
        ownerId: undefined,
        accountId: 'USER-101',
      }),
    ),
    true,
  );
});

// -----------------------------------------------------------------------------
// canRevokeSession
// -----------------------------------------------------------------------------

test('canRevokeSession permits the session owner', () => {
  assert.equal(
    canRevokeSession(
      makeActor(),
      makeSession(),
    ),
    true,
  );
});

test('canRevokeSession permits an administrator', () => {
  assert.equal(
    canRevokeSession(
      makeAdmin(),
      makeSession({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canRevokeSession permits auth:sessions:revoke:any permission', () => {
  assert.equal(
    canRevokeSession(
      makeActor({
        permissions: ['auth:sessions:revoke:any'],
      }),
      makeSession({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canRevokeSession denies an unrelated user without permission', () => {
  assert.equal(
    canRevokeSession(
      makeActor({ id: 'USER-202' }),
      makeSession(),
    ),
    false,
  );
});

test('canRevokeSession permits the owner even when the session is already revoked', () => {
  assert.equal(
    canRevokeSession(
      makeActor(),
      makeSession({ revoked: true }),
    ),
    true,
  );
});

test('canRevokeSession rejects a missing actor', () => {
  assert.equal(
    canRevokeSession(null, makeSession()),
    false,
  );
});

test('canRevokeSession rejects a missing session', () => {
  assert.equal(
    canRevokeSession(makeActor(), null),
    false,
  );
});

test('canRevokeSession rejects a primitive session', () => {
  assert.equal(
    canRevokeSession(makeActor(), 'SESSION-101'),
    false,
  );
});

// -----------------------------------------------------------------------------
// canRevokeAllSessions
// -----------------------------------------------------------------------------

test('canRevokeAllSessions permits a user to revoke their own sessions', () => {
  assert.equal(
    canRevokeAllSessions(makeActor(), 'USER-101'),
    true,
  );
});

test('canRevokeAllSessions permits an administrator to revoke another user sessions', () => {
  assert.equal(
    canRevokeAllSessions(makeAdmin(), 'USER-202'),
    true,
  );
});

test('canRevokeAllSessions permits auth:sessions:revoke:any permission', () => {
  assert.equal(
    canRevokeAllSessions(
      makeActor({
        permissions: ['auth:sessions:revoke:any'],
      }),
      'USER-202',
    ),
    true,
  );
});

test('canRevokeAllSessions denies an ordinary user revoking another user sessions', () => {
  assert.equal(
    canRevokeAllSessions(makeActor(), 'USER-202'),
    false,
  );
});

test('canRevokeAllSessions rejects a missing actor', () => {
  assert.equal(
    canRevokeAllSessions(null, 'USER-101'),
    false,
  );
});

test('canRevokeAllSessions rejects a missing target ID', () => {
  assert.equal(
    canRevokeAllSessions(makeActor(), null),
    false,
  );

  assert.equal(
    canRevokeAllSessions(makeActor(), ''),
    false,
  );
});

// -----------------------------------------------------------------------------
// canChangeOwnPassword
// -----------------------------------------------------------------------------

test('canChangeOwnPassword permits an authenticated user changing their own password', () => {
  assert.equal(
    canChangeOwnPassword(
      makeActor(),
      'USER-101',
    ),
    true,
  );
});

test('canChangeOwnPassword permits an active administrator changing their own password', () => {
  assert.equal(
    canChangeOwnPassword(
      makeAdmin(),
      'ADMIN-101',
    ),
    true,
  );
});

test('canChangeOwnPassword denies changing another users password', () => {
  assert.equal(
    canChangeOwnPassword(
      makeActor(),
      'USER-202',
    ),
    false,
  );
});

test('canChangeOwnPassword denies a disabled actor', () => {
  assert.equal(
    canChangeOwnPassword(
      makeActor({ isDisabled: true }),
      'USER-101',
    ),
    false,
  );
});

test('canChangeOwnPassword denies a suspended actor', () => {
  assert.equal(
    canChangeOwnPassword(
      makeActor({ isSuspended: true }),
      'USER-101',
    ),
    false,
  );
});

test('canChangeOwnPassword denies a locked actor', () => {
  assert.equal(
    canChangeOwnPassword(
      makeActor({ isLocked: true }),
      'USER-101',
    ),
    false,
  );
});

test('canChangeOwnPassword denies an actor with disabled status', () => {
  assert.equal(
    canChangeOwnPassword(
      makeActor({ status: 'disabled' }),
      'USER-101',
    ),
    false,
  );
});

test('canChangeOwnPassword rejects a missing actor', () => {
  assert.equal(
    canChangeOwnPassword(null, 'USER-101'),
    false,
  );
});

test('canChangeOwnPassword rejects a missing target ID', () => {
  assert.equal(
    canChangeOwnPassword(makeActor(), null),
    false,
  );

  assert.equal(
    canChangeOwnPassword(makeActor(), ''),
    false,
  );
});

test('canChangeOwnPassword supports alternate actor identity fields', () => {
  assert.equal(
    canChangeOwnPassword(
      makeActor({
        id: undefined,
        userId: 'USER-101',
      }),
      'USER-101',
    ),
    true,
  );

  assert.equal(
    canChangeOwnPassword(
      makeActor({
        id: undefined,
        sub: 'USER-101',
      }),
      'USER-101',
    ),
    true,
  );
});

// -----------------------------------------------------------------------------
// canRequestPasswordReset
// -----------------------------------------------------------------------------

test('canRequestPasswordReset permits a valid email address', () => {
  assert.equal(
    canRequestPasswordReset({
      email: 'user@example.com',
    }),
    true,
  );
});

test('canRequestPasswordReset permits an email with surrounding whitespace', () => {
  assert.equal(
    canRequestPasswordReset({
      email: '  user@example.com  ',
    }),
    true,
  );
});

test('canRequestPasswordReset rejects a missing input', () => {
  assert.equal(canRequestPasswordReset(null), false);
  assert.equal(canRequestPasswordReset(undefined), false);
});

test('canRequestPasswordReset rejects primitive inputs', () => {
  assert.equal(
    canRequestPasswordReset('user@example.com'),
    false,
  );

  assert.equal(
    canRequestPasswordReset(101),
    false,
  );
});

test('canRequestPasswordReset rejects array inputs', () => {
  assert.equal(
    canRequestPasswordReset([
      'user@example.com',
    ]),
    false,
  );
});

test('canRequestPasswordReset rejects a missing email', () => {
  assert.equal(
    canRequestPasswordReset({}),
    false,
  );
});

test('canRequestPasswordReset rejects a non-string email', () => {
  assert.equal(
    canRequestPasswordReset({ email: 101 }),
    false,
  );

  assert.equal(
    canRequestPasswordReset({ email: null }),
    false,
  );
});

test('canRequestPasswordReset rejects an empty email', () => {
  assert.equal(
    canRequestPasswordReset({ email: '' }),
    false,
  );
});

test('canRequestPasswordReset rejects whitespace-only email', () => {
  assert.equal(
    canRequestPasswordReset({ email: '   ' }),
    false,
  );
});

test('canRequestPasswordReset does not mutate its input', () => {
  const input = {
    email: '  user@example.com  ',
  };

  const original = { ...input };

  canRequestPasswordReset(input);

  assert.deepEqual(input, original);
});

// -----------------------------------------------------------------------------
// canResetAnotherUserPassword
// -----------------------------------------------------------------------------

test('canResetAnotherUserPassword permits an administrator resetting another account', () => {
  assert.equal(
    canResetAnotherUserPassword(
      makeAdmin(),
      'USER-202',
    ),
    true,
  );
});

test('canResetAnotherUserPassword permits auth:password:reset:any permission', () => {
  assert.equal(
    canResetAnotherUserPassword(
      makeActor({
        permissions: ['auth:password:reset:any'],
      }),
      'USER-202',
    ),
    true,
  );
});

test('canResetAnotherUserPassword denies an ordinary user resetting another account', () => {
  assert.equal(
    canResetAnotherUserPassword(
      makeActor(),
      'USER-202',
    ),
    false,
  );
});

test('canResetAnotherUserPassword denies resetting ones own password through the administrative operation', () => {
  assert.equal(
    canResetAnotherUserPassword(
      makeActor({
        permissions: ['auth:password:reset:any'],
      }),
      'USER-101',
    ),
    false,
  );
});

test('canResetAnotherUserPassword denies an administrator resetting their own account through this operation', () => {
  assert.equal(
    canResetAnotherUserPassword(
      makeAdmin(),
      'ADMIN-101',
    ),
    false,
  );
});

test('canResetAnotherUserPassword rejects a missing actor', () => {
  assert.equal(
    canResetAnotherUserPassword(null, 'USER-202'),
    false,
  );
});

test('canResetAnotherUserPassword rejects a missing target ID', () => {
  assert.equal(
    canResetAnotherUserPassword(makeAdmin(), null),
    false,
  );

  assert.equal(
    canResetAnotherUserPassword(makeAdmin(), ''),
    false,
  );
});

// -----------------------------------------------------------------------------
// canManageAuthConfiguration
// -----------------------------------------------------------------------------

test('canManageAuthConfiguration permits an administrator', () => {
  assert.equal(
    canManageAuthConfiguration(makeAdmin()),
    true,
  );
});

test('canManageAuthConfiguration permits auth:configuration:manage permission', () => {
  assert.equal(
    canManageAuthConfiguration(
      makeActor({
        permissions: ['auth:configuration:manage'],
      }),
    ),
    true,
  );
});

test('canManageAuthConfiguration denies an ordinary user', () => {
  assert.equal(
    canManageAuthConfiguration(makeActor()),
    false,
  );
});

test('canManageAuthConfiguration denies unrelated permissions', () => {
  assert.equal(
    canManageAuthConfiguration(
      makeActor({
        permissions: ['auth:accounts:read:any'],
      }),
    ),
    false,
  );
});

test('canManageAuthConfiguration rejects a missing actor', () => {
  assert.equal(
    canManageAuthConfiguration(null),
    false,
  );
});

test('canManageAuthConfiguration rejects an empty actor', () => {
  assert.equal(
    canManageAuthConfiguration({}),
    false,
  );
});

// -----------------------------------------------------------------------------
// canUsePrivilegedAuthOperations
// -----------------------------------------------------------------------------

test('canUsePrivilegedAuthOperations permits an active administrator', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(makeAdmin()),
    true,
  );
});

test('canUsePrivilegedAuthOperations permits a verified administrator', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeAdmin({ status: 'verified' }),
    ),
    true,
  );
});

test('canUsePrivilegedAuthOperations permits an active counsellor', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeActor({
        role: 'counsellor',
        status: 'active',
      }),
    ),
    true,
  );
});

test('canUsePrivilegedAuthOperations permits an active support actor', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeActor({
        role: 'support',
        status: 'active',
      }),
    ),
    true,
  );
});

test('canUsePrivilegedAuthOperations permits an actor with permissions', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeActor({
        permissions: ['auth:accounts:read:any'],
      }),
    ),
    true,
  );
});

test('canUsePrivilegedAuthOperations permits a verified actor with permissions', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeActor({
        status: 'verified',
        permissions: ['auth:accounts:read:any'],
      }),
    ),
    true,
  );
});

test('canUsePrivilegedAuthOperations denies an ordinary user without permissions', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeActor({
        role: 'user',
        permissions: [],
      }),
    ),
    false,
  );
});

test('canUsePrivilegedAuthOperations denies a disabled administrator', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeAdmin({ isDisabled: true }),
    ),
    false,
  );
});

test('canUsePrivilegedAuthOperations denies a suspended administrator', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeAdmin({ isSuspended: true }),
    ),
    false,
  );
});

test('canUsePrivilegedAuthOperations denies a locked administrator', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeAdmin({ isLocked: true }),
    ),
    false,
  );
});

test('canUsePrivilegedAuthOperations denies a deleted administrator', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeAdmin({
        deletedAt: '2026-01-01T00:00:00.000Z',
      }),
    ),
    false,
  );
});

test('canUsePrivilegedAuthOperations denies an administrator with disabled status', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeAdmin({ status: 'disabled' }),
    ),
    false,
  );
});

test('canUsePrivilegedAuthOperations denies an administrator with an unrecognized nonempty status', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeAdmin({ status: 'pending_verification' }),
    ),
    false,
  );
});

test('canUsePrivilegedAuthOperations denies a roleless actor without permissions', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(
      makeActor({
        role: undefined,
        roles: undefined,
        permissions: [],
      }),
    ),
    false,
  );
});

test('canUsePrivilegedAuthOperations rejects a missing actor', () => {
  assert.equal(
    canUsePrivilegedAuthOperations(null),
    false,
  );
});

test('canUsePrivilegedAuthOperations rejects a primitive actor', () => {
  assert.equal(
    canUsePrivilegedAuthOperations('ADMIN-101'),
    false,
  );
});


'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAuthService,
  sanitizeUser,
} = require('../../../src/services/auth.service');

function createMocks(options = {}) {
  const users = options.users || [];
  const createdUsers = [];
  const auditEvents = [];
  const sessions = [];
  const revokedSessions = [];
  const revokedTokens = [];
  const issuedTokens = [];
  const hashedPasswords = [];

  const userRepository = {
    async findByEmail(email) {
      if (options.findByEmailError) {
        throw options.findByEmailError;
      }

      return users.find(
        (user) => user.email === email
      ) || null;
    },

    async create(input) {
      if (options.createUserError) {
        throw options.createUserError;
      }

      if (options.createUserResult !== undefined) {
        return options.createUserResult;
      }

      const user = {
        id: `user-${createdUsers.length + 1}`,
        ...input,
      };

      users.push(user);
      createdUsers.push(user);

      return user;
    },
  };

  const passwordHasher = {
    async hash(password) {
      hashedPasswords.push(password);

      if (options.hashError) {
        throw options.hashError;
      }

      return `hashed:${password}`;
    },

    async verify(password, passwordHash) {
      if (options.verifyError) {
        throw options.verifyError;
      }

      if (options.verifyResult !== undefined) {
        return options.verifyResult;
      }

      return passwordHash === `hashed:${password}`;
    },
  };

  const tokenService = {
    async issue(input) {
      issuedTokens.push(input);

      if (options.issueError) {
        throw options.issueError;
      }

      if (options.issueResult !== undefined) {
        return options.issueResult;
      }

      return {
        accessToken: 'access-test-token',
        refreshToken: 'refresh-test-token',
        expiresIn: 900,
      };
    },

    async refresh(token) {
      if (options.refreshError) {
        throw options.refreshError;
      }

      return options.refreshResult || {
        accessToken: 'refreshed-access-token',
        refreshToken: 'refreshed-refresh-token',
        receivedToken: token,
      };
    },

    async revoke(token) {
      if (options.revokeTokenError) {
        throw options.revokeTokenError;
      }

      revokedTokens.push(token);
    },
  };

  const sessionService = {
    async create(userId, context) {
      if (options.createSessionError) {
        throw options.createSessionError;
      }

      const session = {
        id: `session-${sessions.length + 1}`,
        userId,
        context,
      };

      sessions.push(session);

      return session;
    },

    async revoke(sessionId, userId) {
      if (options.revokeSessionError) {
        throw options.revokeSessionError;
      }

      revokedSessions.push({ sessionId, userId });
    },
  };

  const auditService = {
    async record(event) {
      if (options.auditError) {
        throw options.auditError;
      }

      auditEvents.push(event);
    },
  };

  const verificationService = {
    async sendEmailVerification(user) {
      if (options.verificationError) {
        throw options.verificationError;
      }

      if (options.verificationHook) {
        await options.verificationHook(user);
      }
    },
  };

  const service = createAuthService({
    userRepository,
    passwordHasher,
    tokenService,
    sessionService: options.omitSessionService
      ? undefined
      : sessionService,
    auditService: options.omitAuditService
      ? undefined
      : auditService,
    verificationService: options.omitVerificationService
      ? undefined
      : verificationService,
  });

  return {
    service,
    users,
    userRepository,
    passwordHasher,
    tokenService,
    sessionService,
    auditService,
    verificationService,
    createdUsers,
    auditEvents,
    sessions,
    revokedSessions,
    revokedTokens,
    issuedTokens,
    hashedPasswords,
  };
}

function makeUser(overrides = {}) {
  return {
    id: 'user-123',
    name: 'Test User',
    email: 'user@example.com',
    passwordHash: 'hashed:StrongPassword123',
    status: 'active',
    roles: ['user'],
    ...overrides,
  };
}

async function expectServiceError(
  promise,
  code,
  status
) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code);

    if (status !== undefined) {
      assert.equal(error.status, status);
    }

    return true;
  });
}

test('createAuthService requires userRepository', () => {
  assert.throws(
    () => createAuthService({
      passwordHasher: {
        hash() {},
        verify() {},
      },
      tokenService: {
        issue() {},
      },
    }),
    TypeError
  );
});

test('createAuthService requires passwordHasher', () => {
  assert.throws(
    () => createAuthService({
      userRepository: {
        create() {},
      },
      tokenService: {
        issue() {},
      },
    }),
    TypeError
  );
});

test('createAuthService requires tokenService', () => {
  assert.throws(
    () => createAuthService({
      userRepository: {
        create() {},
      },
      passwordHasher: {
        hash() {},
        verify() {},
      },
    }),
    TypeError
  );
});

test('createAuthService validates required dependency methods', () => {
  assert.throws(
    () => createAuthService({
      userRepository: {},
      passwordHasher: {
        hash() {},
        verify() {},
      },
      tokenService: {
        issue() {},
      },
    }),
    /userRepository must implement create/
  );

  assert.throws(
    () => createAuthService({
      userRepository: {
        create() {},
      },
      passwordHasher: {
        verify() {},
      },
      tokenService: {
        issue() {},
      },
    }),
    /passwordHasher must implement hash/
  );

  assert.throws(
    () => createAuthService({
      userRepository: {
        create() {},
      },
      passwordHasher: {
        hash() {},
      },
      tokenService: {
        issue() {},
      },
    }),
    /passwordHasher must implement verify/
  );

  assert.throws(
    () => createAuthService({
      userRepository: {
        create() {},
      },
      passwordHasher: {
        hash() {},
        verify() {},
      },
      tokenService: {},
    }),
    /tokenService must implement issue/
  );
});

test('sanitizeUser removes sensitive authentication fields', () => {
  const result = sanitizeUser({
    id: 'user-1',
    email: 'user@example.com',
    password: 'secret',
    passwordHash: 'hash',
    resetToken: 'reset',
    resetTokenHash: 'reset-hash',
    verificationToken: 'verification',
    verificationTokenHash: 'verification-hash',
    refreshToken: 'refresh',
    accessToken: 'access',
    sessionToken: 'session',
    recoveryCode: 'recovery',
    recoveryCodes: ['one', 'two'],
    mfaSecret: 'mfa',
    twoFactorSecret: 'two-factor',
  });

  assert.deepEqual(result, {
    id: 'user-1',
    email: 'user@example.com',
  });
});

test('sanitizeUser returns null for invalid user values', () => {
  for (const value of [
    null,
    undefined,
    'user',
    123,
    [],
  ]) {
    assert.equal(sanitizeUser(value), null);
  }
});

test('register normalizes email and creates a pending account', async () => {
  const mocks = createMocks();

  const result = await mocks.service.register({
    name: 'Test User',
    email: '  USER@EXAMPLE.COM ',
    password: 'StrongPassword123',
  });

  assert.equal(mocks.createdUsers.length, 1);

  assert.equal(
    mocks.createdUsers[0].email,
    'user@example.com'
  );

  assert.equal(
    mocks.createdUsers[0].passwordHash,
    'hashed:StrongPassword123'
  );

  assert.equal(
    mocks.createdUsers[0].status,
    'pending_verification'
  );

  assert.deepEqual(
    mocks.createdUsers[0].roles,
    ['user']
  );

  assert.deepEqual(result, {
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
      status: 'pending_verification',
      roles: ['user'],
    },
    verificationRequired: true,
  });

  assert.equal(
    mocks.auditEvents[0].action,
    'auth.registered'
  );

  assert.equal(
    mocks.auditEvents[0].actorId,
    'user-1'
  );
});

test('register does not expose password hashes', async () => {
  const { service } = createMocks();

  const result = await service.register({
    name: 'Safe User',
    email: 'safe@example.com',
    password: 'StrongPassword123',
  });

  assert.equal(
    Object.hasOwn(result.user, 'passwordHash'),
    false
  );

  assert.equal(
    Object.hasOwn(result.user, 'password'),
    false
  );
});

test('register rejects duplicate email addresses', async () => {
  const { service } = createMocks({
    users: [
      makeUser({
        email: 'user@example.com',
      }),
    ],
  });

  await expectServiceError(
    service.register({
      name: 'Another User',
      email: 'USER@example.com',
      password: 'StrongPassword123',
    }),
    'EMAIL_IN_USE',
    409
  );
});

test('register rejects missing or invalid input', async (t) => {
  const { service } = createMocks();

  const cases = [
    {
      label: 'missing name',
      input: {
        email: 'user@example.com',
        password: 'StrongPassword123',
      },
    },
    {
      label: 'missing email',
      input: {
        name: 'Test User',
        password: 'StrongPassword123',
      },
    },
    {
      label: 'missing password',
      input: {
        name: 'Test User',
        email: 'user@example.com',
      },
    },
    {
      label: 'blank name',
      input: {
        name: '  ',
        email: 'user@example.com',
        password: 'StrongPassword123',
      },
    },
    {
      label: 'blank email',
      input: {
        name: 'Test User',
        email: '  ',
        password: 'StrongPassword123',
      },
    },
    {
      label: 'password shorter than 10 characters',
      input: {
        name: 'Test User',
        email: 'user@example.com',
        password: 'short',
      },
    },
    {
      label: 'password longer than 200 characters',
      input: {
        name: 'Test User',
        email: 'user@example.com',
        password: 'p'.repeat(201),
      },
    },
    {
      label: 'name longer than 120 characters',
      input: {
        name: 'n'.repeat(121),
        email: 'user@example.com',
        password: 'StrongPassword123',
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.label, async () => {
      await assert.rejects(
        service.register(item.input),
        (error) => error.code === 'VALIDATION_ERROR'
      );
    });
  }
});

test('register propagates email lookup errors', async () => {
  const error = new Error('Database unavailable');
  const { service } = createMocks({
    findByEmailError: error,
  });

  await assert.rejects(
    service.register({
      name: 'Test User',
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    (caught) => caught === error
  );
});

test('register propagates password hashing errors', async () => {
  const error = new Error('Hashing failed');
  const { service } = createMocks({
    hashError: error,
  });

  await assert.rejects(
    service.register({
      name: 'Test User',
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    (caught) => caught === error
  );
});

test('register propagates user creation errors', async () => {
  const error = new Error('Insert failed');
  const { service } = createMocks({
    createUserError: error,
  });

  await assert.rejects(
    service.register({
      name: 'Test User',
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    (caught) => caught === error
  );
});

test('register rejects a null user returned by the repository', async () => {
  const { service } = createMocks({
    createUserResult: null,
  });

  await assert.rejects(
    service.register({
      name: 'Test User',
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    (error) => error.code === 'NOT_FOUND'
  );
});

test('register tolerates verification email failures', async () => {
  const { service, createdUsers, auditEvents } = createMocks({
    verificationError: new Error('Email provider unavailable'),
  });

  const result = await service.register({
    name: 'Test User',
    email: 'user@example.com',
    password: 'StrongPassword123',
  });

  assert.equal(createdUsers.length, 1);
  assert.equal(
    createdUsers[0].status,
    'pending_verification'
  );

  assert.equal(result.verificationRequired, true);
  assert.equal(auditEvents.length, 1);
});

test('register works when verification is not configured', async () => {
  const { service } = createMocks({
    omitVerificationService: true,
  });

  const result = await service.register({
    name: 'Test User',
    email: 'user@example.com',
    password: 'StrongPassword123',
  });

  assert.equal(result.verificationRequired, false);
});

test('register works when verification service has no send method', async () => {
  const mocks = createMocks();

  const service = createAuthService({
    userRepository: mocks.userRepository,
    passwordHasher: mocks.passwordHasher,
    tokenService: mocks.tokenService,
    auditService: mocks.auditService,
    verificationService: {},
  });

  const result = await service.register({
    name: 'Test User',
    email: 'user@example.com',
    password: 'StrongPassword123',
  });

  assert.equal(result.verificationRequired, false);
});

test('register tolerates audit service failures', async () => {
  const { service } = createMocks({
    auditError: new Error('Audit unavailable'),
  });

  const result = await service.register({
    name: 'Test User',
    email: 'user@example.com',
    password: 'StrongPassword123',
  });

  assert.equal(result.user.email, 'user@example.com');
});

test('login returns sanitized user, session and tokens', async () => {
  const user = makeUser();
  const mocks = createMocks({
    users: [user],
  });

  const context = {
    ipAddress: '192.0.2.20',
    userAgent: 'Test Agent',
  };

  const result = await mocks.service.login({
    email: ' USER@EXAMPLE.COM ',
    password: 'StrongPassword123',
  }, context);

  assert.equal(result.user.id, user.id);
  assert.equal(result.user.email, user.email);
  assert.equal(
    Object.hasOwn(result.user, 'passwordHash'),
    false
  );

  assert.equal(
    result.accessToken,
    'access-test-token'
  );

  assert.equal(
    result.refreshToken,
    'refresh-test-token'
  );

  assert.equal(result.session.id, 'session-1');
  assert.equal(result.session.userId, user.id);
  assert.deepEqual(result.session.context, context);

  assert.deepEqual(mocks.issuedTokens[0], {
    userId: user.id,
    sessionId: 'session-1',
    roles: ['user'],
  });

  assert.equal(mocks.auditEvents[0].action, 'auth.login');
});

test('login rejects an unknown email with generic credentials error', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.login({
      email: 'missing@example.com',
      password: 'StrongPassword123',
    }),
    'INVALID_CREDENTIALS',
    401
  );
});

test('login rejects an incorrect password', async () => {
  const { service } = createMocks({
    users: [makeUser()],
  });

  await expectServiceError(
    service.login({
      email: 'user@example.com',
      password: 'IncorrectPassword123',
    }),
    'INVALID_CREDENTIALS',
    401
  );
});

test('login rejects a user without a password hash', async () => {
  const { service } = createMocks({
    users: [
      makeUser({
        passwordHash: null,
      }),
    ],
  });

  await expectServiceError(
    service.login({
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    'INVALID_CREDENTIALS',
    401
  );
});

test('login rejects invalid input', async (t) => {
  const { service } = createMocks();

  const cases = [
    {
      label: 'missing email',
      input: { password: 'StrongPassword123' },
    },
    {
      label: 'missing password',
      input: { email: 'user@example.com' },
    },
    {
      label: 'blank email',
      input: {
        email: ' ',
        password: 'StrongPassword123',
      },
    },
    {
      label: 'blank password',
      input: {
        email: 'user@example.com',
        password: ' ',
      },
    },
    {
      label: 'password longer than 200 characters',
      input: {
        email: 'user@example.com',
        password: 'p'.repeat(201),
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.label, async () => {
      await assert.rejects(
        service.login(item.input),
        (error) => error.code === 'VALIDATION_ERROR'
      );
    });
  }
});

test('login blocks suspended, disabled and blocked accounts', async (t) => {
  for (const status of [
    'suspended',
    'disabled',
    'blocked',
  ]) {
    await t.test(status, async () => {
      const { service } = createMocks({
        users: [makeUser({ status })],
      });

      await expectServiceError(
        service.login({
          email: 'user@example.com',
          password: 'StrongPassword123',
        }),
        'ACCOUNT_UNAVAILABLE',
        403
      );
    });
  }
});

test('login requires email verification for pending accounts', async (t) => {
  for (const status of [
    'pending',
    'pending_verification',
  ]) {
    await t.test(status, async () => {
      const { service } = createMocks({
        users: [makeUser({ status })],
      });

      await expectServiceError(
        service.login({
          email: 'user@example.com',
          password: 'StrongPassword123',
        }),
        'VERIFICATION_REQUIRED',
        403
      );
    });
  }
});

test('login blocks other non-active statuses', async () => {
  const { service } = createMocks({
    users: [
      makeUser({
        status: 'deleted',
      }),
    ],
  });

  await expectServiceError(
    service.login({
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    'ACCOUNT_UNAVAILABLE',
    403
  );
});

test('login propagates password verification errors', async () => {
  const error = new Error('Password verifier failed');
  const { service } = createMocks({
    users: [makeUser()],
    verifyError: error,
  });

  await assert.rejects(
    service.login({
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    (caught) => caught === error
  );
});

test('login works without a session service', async () => {
  const { service, issuedTokens } = createMocks({
    users: [makeUser()],
    omitSessionService: true,
  });

  const result = await service.login({
    email: 'user@example.com',
    password: 'StrongPassword123',
  });

  assert.equal(result.session, null);

  assert.deepEqual(issuedTokens[0], {
    userId: 'user-123',
    sessionId: undefined,
    roles: ['user'],
  });
});

test('login uses an empty role list when user roles are invalid', async () => {
  const { service, issuedTokens } = createMocks({
    users: [
      makeUser({
        roles: 'admin',
      }),
    ],
  });

  await service.login({
    email: 'user@example.com',
    password: 'StrongPassword123',
  });

  assert.deepEqual(issuedTokens[0].roles, []);
});

test('login rejects when session creation returns null', async () => {
  const mocks = createMocks({
    users: [makeUser()],
  });

  mocks.sessionService.create = async () => null;

  await assert.rejects(
    mocks.service.login({
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    (error) => error.code === 'NOT_FOUND'
  );
});

test('login rejects when session service lacks create', async () => {
  const mocks = createMocks({
    users: [makeUser()],
  });

  const service = createAuthService({
    userRepository: mocks.userRepository,
    passwordHasher: mocks.passwordHasher,
    tokenService: mocks.tokenService,
    sessionService: {},
  });

  await assert.rejects(
    service.login({
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    /sessionService must implement create/
  );
});

test('login rejects invalid token service results', async () => {
  const { service } = createMocks({
    users: [makeUser()],
    issueResult: null,
  });

  await assert.rejects(
    service.login({
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    /tokenService.issue\(\) must return a token object/
  );
});

test('login revokes a created session if token issuance fails', async () => {
  const error = new Error('Token issuer unavailable');

  const {
    service,
    revokedSessions,
  } = createMocks({
    users: [makeUser()],
    issueError: error,
  });

  await assert.rejects(
    service.login({
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    (caught) => caught === error
  );

  assert.deepEqual(revokedSessions, [
    {
      sessionId: 'session-1',
      userId: 'user-123',
    },
  ]);
});

test('login still rejects when session cleanup fails', async () => {
  const tokenError = new Error('Token issuer unavailable');

  const {
    service,
    sessionService,
  } = createMocks({
    users: [makeUser()],
    issueError: tokenError,
  });

  sessionService.revoke = async () => {
    throw new Error('Cleanup failed');
  };

  await assert.rejects(
    service.login({
      email: 'user@example.com',
      password: 'StrongPassword123',
    }),
    (caught) => caught === tokenError
  );
});

test('login tolerates audit failures', async () => {
  const { service } = createMocks({
    users: [makeUser()],
    auditError: new Error('Audit unavailable'),
  });

  const result = await service.login({
    email: 'user@example.com',
    password: 'StrongPassword123',
  });

  assert.equal(result.user.id, 'user-123');
});

test('refresh delegates to tokenService.refresh', async () => {
  const { service } = createMocks();

  const result = await service.refresh({
    refreshToken: 'refresh-token-value',
  });

  assert.equal(
    result.receivedToken,
    'refresh-token-value'
  );
});

test('refresh rejects missing or invalid refresh tokens', async (t) => {
  const { service } = createMocks();

  for (const input of [
    {},
    { refreshToken: '' },
    { refreshToken: ' ' },
    { refreshToken: 'x'.repeat(4097) },
  ]) {
    await t.test(JSON.stringify(input), async () => {
      await assert.rejects(
        service.refresh(input),
        (error) => error.code === 'VALIDATION_ERROR'
      );
    });
  }
});

test('refresh returns a configuration error when refresh is unavailable', async () => {
  const mocks = createMocks();

  const tokenService = {
    issue: mocks.tokenService.issue,
  };

  const service = createAuthService({
    userRepository: mocks.userRepository,
    passwordHasher: mocks.passwordHasher,
    tokenService,
  });

  await expectServiceError(
    service.refresh({
      refreshToken: 'refresh-token',
    }),
    'TOKEN_REFRESH_UNAVAILABLE',
    501
  );
});

test('refresh propagates token service errors', async () => {
  const error = new Error('Refresh rejected');
  const { service } = createMocks({
    refreshError: error,
  });

  await assert.rejects(
    service.refresh({
      refreshToken: 'refresh-token',
    }),
    (caught) => caught === error
  );
});

test('logout returns loggedOut true when no credentials are supplied', async () => {
  const { service } = createMocks();

  assert.deepEqual(
    await service.logout(),
    { loggedOut: true }
  );
});

test('logout revokes a session for the specified user', async () => {
  const {
    service,
    revokedSessions,
    auditEvents,
  } = createMocks();

  const result = await service.logout({
    userId: 'user-123',
    sessionId: 'session-123',
  });

  assert.deepEqual(result, {
    loggedOut: true,
  });

  assert.deepEqual(revokedSessions, [
    {
      sessionId: 'session-123',
      userId: 'user-123',
    },
  ]);

  assert.equal(auditEvents[0].action, 'auth.logout');
  assert.equal(auditEvents[0].actorId, 'user-123');
  assert.deepEqual(auditEvents[0].metadata, {
    sessionRevoked: true,
    refreshTokenRevoked: false,
  });
});

test('logout revokes a refresh token', async () => {
  const {
    service,
    revokedTokens,
  } = createMocks();

  await service.logout({
    refreshToken: 'refresh-token-123',
  });

  assert.deepEqual(
    revokedTokens,
    ['refresh-token-123']
  );
});

test('logout can revoke both session and refresh token', async () => {
  const {
    service,
    revokedSessions,
    revokedTokens,
    auditEvents,
  } = createMocks();

  await service.logout({
    userId: 'user-123',
    sessionId: 'session-123',
    refreshToken: 'refresh-token-123',
  });

  assert.equal(revokedSessions.length, 1);
  assert.deepEqual(
    revokedTokens,
    ['refresh-token-123']
  );

  assert.deepEqual(auditEvents[0].metadata, {
    sessionRevoked: true,
    refreshTokenRevoked: true,
  });
});

test('logout rejects invalid session IDs', async () => {
  const { service } = createMocks();

  await assert.rejects(
    service.logout({
      userId: 'user-123',
      sessionId: ' ',
    }),
    (error) => error.code === 'VALIDATION_ERROR'
  );
});

test('logout requires user ID when revoking a session', async () => {
  const { service } = createMocks();

  await assert.rejects(
    service.logout({
      sessionId: 'session-123',
    }),
    (error) => error.code === 'VALIDATION_ERROR'
  );
});

test('logout reports missing session revocation configuration', async () => {
  const mocks = createMocks({
    omitSessionService: true,
  });

  await expectServiceError(
    mocks.service.logout({
      userId: 'user-123',
      sessionId: 'session-123',
    }),
    'SESSION_REVOCATION_UNAVAILABLE',
    501
  );
});

test('logout reports missing token revocation configuration', async () => {
  const mocks = createMocks();

  const tokenService = {
    issue: mocks.tokenService.issue,
  };

  const service = createAuthService({
    userRepository: mocks.userRepository,
    passwordHasher: mocks.passwordHasher,
    tokenService,
    sessionService: mocks.sessionService,
  });

  await expectServiceError(
    service.logout({
      refreshToken: 'refresh-token',
    }),
    'TOKEN_REVOCATION_UNAVAILABLE',
    501
  );
});

test('logout rejects invalid refresh tokens', async (t) => {
  const { service } = createMocks();

  for (const refreshToken of [
    '',
    ' ',
    'x'.repeat(4097),
  ]) {
    await t.test(
      `rejects token length ${refreshToken.length}`,
      async () => {
        await assert.rejects(
          service.logout({ refreshToken }),
          (error) => error.code === 'VALIDATION_ERROR'
        );
      }
    );
  }
});

test('logout propagates session revocation failures', async () => {
  const error = new Error('Session revocation failed');

  const { service } = createMocks({
    revokeSessionError: error,
  });

  await assert.rejects(
    service.logout({
      userId: 'user-123',
      sessionId: 'session-123',
    }),
    (caught) => caught === error
  );
});

test('logout propagates token revocation failures', async () => {
  const error = new Error('Token revocation failed');

  const { service } = createMocks({
    revokeTokenError: error,
  });

  await assert.rejects(
    service.logout({
      refreshToken: 'refresh-token',
    }),
    (caught) => caught === error
  );
});

test('logout tolerates audit failures', async () => {
  const { service } = createMocks({
    auditError: new Error('Audit unavailable'),
  });

  assert.deepEqual(
    await service.logout({
      userId: 'user-123',
    }),
    { loggedOut: true }
  );
});

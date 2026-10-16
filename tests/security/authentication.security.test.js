'use strict';
const jwt = require('jsonwebtoken');
const authenticate = require('../../src/middleware/authenticate');
const {
  createAuthService,
  sanitizeUser,
} = require('../../src/services/auth.service');
const authValidator = require('../../src/validators/auth.validator');
const JWT_SECRET =
  'medorbits-test-secret-that-is-long-enough-for-hmac-sha256';
const NOW = 1_800_000_000;
function createRequest(authorization = '') {
  return {
    headers: {
      authorization,
    },
    get(name) {
      return this.headers[String(name).toLowerCase()] || '';
    },
  };
}
function createResponse() {
  return {
    statusCode: 200,
    headersSent: false,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      return this;
    },
  };
}
async function invokeMiddleware(middleware, req = createRequest()) {
  const res = createResponse();
  let nextCalled = false;
  let nextError;
  await middleware(req, res, (error) => {
    nextCalled = true;
    nextError = error;
  });
  return {
    req,
    res,
    nextCalled,
    error: nextError,
  };
}
function signToken(
  claims = {},
  options = {},
) {
  return jwt.sign(
    {
      sub: 'user-123',
      roles: ['student'],
      permissions: ['courses:read'],
      ...claims,
    },
    options.secret || JWT_SECRET,
    {
      algorithm: options.algorithm || 'HS256',
      ...(options.expiresIn !== undefined
        ? { expiresIn: options.expiresIn }
        : { expiresIn: '5m' }),
      ...(options.issuer ? { issuer: options.issuer } : {}),
      ...(options.audience ? { audience: options.audience } : {}),
      ...(options.noTimestamp ? { noTimestamp: true } : {}),
    },
  );
}
function createAuthDependencies(overrides = {}) {
  const user = {
    id: 'user-123',
    name: 'Test Student',
    email: 'student@example.com',
    passwordHash: 'stored-password-hash',
    status: 'active',
    roles: ['student'],
    permissions: ['courses:read'],
    resetToken: 'private-reset-token',
    refreshToken: 'private-refresh-token',
  };
  const userRepository = {
    findByEmail: jest.fn().mockResolvedValue({ ...user }),
    create: jest.fn().mockImplementation(async (data) => ({
      id: 'user-456',
      ...data,
    })),
  };
  const passwordHasher = {
    hash: jest.fn().mockResolvedValue('new-password-hash'),
    verify: jest.fn().mockResolvedValue(true),
  };
  const tokenService = {
    issue: jest.fn().mockResolvedValue({
      accessToken: 'issued-access-token',
      refreshToken: 'issued-refresh-token',
    }),
    refresh: jest.fn().mockResolvedValue({
      accessToken: 'refreshed-access-token',
    }),
    revoke: jest.fn().mockResolvedValue(undefined),
  };
  const sessionService = {
    create: jest.fn().mockResolvedValue({
      id: 'session-123',
      userId: 'user-123',
    }),
    revoke: jest.fn().mockResolvedValue(undefined),
  };
  const auditService = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const verificationService = {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  };
  const dependencies = {
    userRepository,
    passwordHasher,
    tokenService,
    sessionService,
    auditService,
    verificationService,
    user,
    ...overrides,
  };
  dependencies.service = createAuthService({
    userRepository: dependencies.userRepository,
    passwordHasher: dependencies.passwordHasher,
    tokenService: dependencies.tokenService,
    sessionService: dependencies.sessionService,
    auditService: dependencies.auditService,
    verificationService: dependencies.verificationService,
  });
  return dependencies;
}
describe('Authentication security: JWT configuration', () => {
  test('rejects a missing signing secret', () => {
    expect(() => authenticate({ secret: '' })).toThrow(
      /JWT_SECRET must be configured/i,
    );
  });
  test('rejects a signing secret shorter than 32 characters', () => {
    expect(() => authenticate({ secret: 'too-short' })).toThrow(
      /at least 32 characters/i,
    );
  });
  test('accepts a sufficiently strong configured secret', () => {
    expect(() => authenticate({ secret: JWT_SECRET })).not.toThrow();
  });
  test('uses an explicit algorithm allowlist by default', async () => {
    const middleware = authenticate({ secret: JWT_SECRET });
    const token = signToken({}, { algorithm: 'HS384' });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
    expect(result.req.user).toBeUndefined();
  });
  test('supports an explicitly configured algorithm allowlist', async () => {
    const middleware = authenticate({
      secret: JWT_SECRET,
      algorithms: ['HS384'],
    });
    const token = signToken({}, { algorithm: 'HS384' });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toBeUndefined();
    expect(result.req.user.id).toBe('user-123');
  });
  test('rejects an unsigned JWT', async () => {
    const middleware = authenticate({ secret: JWT_SECRET });
    const token = jwt.sign(
      { sub: 'user-123', roles: ['admin'] },
      null,
      { algorithm: 'none' },
    );
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
    expect(result.req.user).toBeUndefined();
  });
  test('rejects a token signed with another secret', async () => {
    const middleware = authenticate({ secret: JWT_SECRET });
    const token = signToken({}, {
      secret: 'different-test-secret-long-enough-for-hmac',
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });
});
describe('Authentication security: bearer token parsing', () => {
  let middleware;
  beforeEach(() => {
    middleware = authenticate({ secret: JWT_SECRET });
  });
  test.each([
    '',
    'invalid-token',
    'Basic abc123',
    'Bearer',
    'Bearer ',
    'Bearer token extra',
  ])('rejects a malformed authorization header: %j', async (header) => {
    const result = await invokeMiddleware(
      middleware,
      createRequest(header),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
    expect(result.req.user).toBeUndefined();
  });
  test('accepts case-insensitive Bearer scheme', async () => {
    const token = signToken();
    const result = await invokeMiddleware(
      middleware,
      createRequest(`bEaReR ${token}`),
    );
    expect(result.error).toBeUndefined();
    expect(result.req.user.id).toBe('user-123');
  });
  test('rejects an invalid token without exposing verification details', async () => {
    const result = await invokeMiddleware(
      middleware,
      createRequest('Bearer invalid.token.value'),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
      publicMessage: 'The access token is invalid or expired.',
    });
    expect(result.error.message).not.toMatch(/signature|stack|secret/i);
  });
  test('rejects an expired token', async () => {
    const token = jwt.sign(
      {
        sub: 'user-123',
        exp: NOW - 60,
      },
      JWT_SECRET,
      {
        algorithm: 'HS256',
      },
    );
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
    expect(result.req.user).toBeUndefined();
  });
  test('rejects a token without a subject claim', async () => {
    const token = jwt.sign(
      { roles: ['admin'] },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    });
    expect(result.req.user).toBeUndefined();
  });
  test('does not trust identity headers when the bearer token is missing', async () => {
    const req = createRequest('');
    req.headers['x-user-id'] = 'attacker';
    req.headers['x-user-role'] = 'admin';
    const result = await invokeMiddleware(middleware, req);
    expect(result.error).toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
    expect(result.req.user).toBeUndefined();
  });
  test('does not authenticate using a request-body identity', async () => {
    const req = createRequest('');
    req.body = {
      userId: 'attacker',
      role: 'admin',
      isAuthenticated: true,
    };
    const result = await invokeMiddleware(middleware, req);
    expect(result.error).toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
    expect(result.req.user).toBeUndefined();
  });
});
describe('Authentication security: JWT claims', () => {
  test('enforces configured issuer', async () => {
    const middleware = authenticate({
      secret: JWT_SECRET,
      issuer: 'https://auth.medorbits.test',
    });
    const token = signToken({}, {
      issuer: 'https://untrusted.example',
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });
  test('accepts a token with the configured issuer', async () => {
    const middleware = authenticate({
      secret: JWT_SECRET,
      issuer: 'https://auth.medorbits.test',
    });
    const token = signToken({}, {
      issuer: 'https://auth.medorbits.test',
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toBeUndefined();
  });
  test('enforces configured audience', async () => {
    const middleware = authenticate({
      secret: JWT_SECRET,
      audience: 'medorbits-api',
    });
    const token = signToken({}, {
      audience: 'another-api',
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });
  test('rejects a missing configured audience', async () => {
    const middleware = authenticate({
      secret: JWT_SECRET,
      audience: 'medorbits-api',
    });
    const token = jwt.sign(
      { sub: 'user-123' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });
  test('rejects tokens with a missing subject', async () => {
    const middleware = authenticate({ secret: JWT_SECRET });
    const token = jwt.sign(
      { roles: ['student'] },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    });
  });
  test('rejects a token whose subject is an empty string', async () => {
    const middleware = authenticate({ secret: JWT_SECRET });
    const token = jwt.sign(
      { sub: '' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    });
  });
  test('normalizes request identity from verified claims', async () => {
    const middleware = authenticate({ secret: JWT_SECRET });
    const token = signToken({
      sub: 123,
      jti: 'token-id-123',
      roles: ['student'],
      permissions: ['courses:read'],
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toBeUndefined();
    expect(result.req.user).toMatchObject({
      id: '123',
      roles: ['student'],
      permissions: ['courses:read'],
    });
    expect(result.req.auth).toMatchObject({
      tokenId: 'token-id-123',
      claims: expect.objectContaining({ sub: '123' }),
    });
  });
  test('does not treat non-array roles and permissions as trusted arrays', async () => {
    const middleware = authenticate({ secret: JWT_SECRET });
    const token = signToken({
      roles: 'admin',
      permissions: 'all',
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(result.error).toBeUndefined();
    expect(result.req.user.roles).toEqual([]);
    expect(result.req.user.permissions).toEqual([]);
  });
});
describe('Authentication security: current account state', () => {
  test('uses getUser to load current trusted user data', async () => {
    const getUser = jest.fn().mockResolvedValue({
      id: 'user-123',
      roles: ['student'],
      permissions: ['courses:read'],
    });
    const middleware = authenticate({
      secret: JWT_SECRET,
      getUser,
    });
    const token = signToken({
      roles: ['admin'],
      permissions: ['users:delete'],
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${token}`),
    );
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(result.error).toBeUndefined();
    expect(result.req.user.roles).toEqual(['student']);
    expect(result.req.user.permissions).toEqual(['courses:read']);
  });
  test.each([
    [null, 'ACCOUNT_UNAVAILABLE'],
    [undefined, 'ACCOUNT_UNAVAILABLE'],
    [{ id: 'user-123', disabled: true }, 'ACCOUNT_UNAVAILABLE'],
    [{ id: 'user-123', isActive: false }, 'ACCOUNT_UNAVAILABLE'],
  ])('rejects unavailable current account %#', async (user, code) => {
    const middleware = authenticate({
      secret: JWT_SECRET,
      getUser: jest.fn().mockResolvedValue(user),
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${signToken()}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code,
    });
    expect(result.req.user).toBeUndefined();
  });
  test('rejects a user lookup exception without leaking internal details', async () => {
    const middleware = authenticate({
      secret: JWT_SECRET,
      getUser: jest.fn().mockRejectedValue(
        new Error('database password and connection details'),
      ),
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${signToken()}`),
    );
    expect(result.error).toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
    expect(result.error.message).not.toContain('database password');
    expect(result.req.user).toBeUndefined();
  });
  test('propagates an explicit authentication error from getUser', async () => {
    const lookupError = Object.assign(
      new Error('This account is unavailable.'),
      {
        status: 401,
        code: 'ACCOUNT_UNAVAILABLE',
        publicMessage: 'This account is unavailable.',
      },
    );
    const middleware = authenticate({
      secret: JWT_SECRET,
      getUser: jest.fn().mockRejectedValue(lookupError),
    });
    const result = await invokeMiddleware(
      middleware,
      createRequest(`Bearer ${signToken()}`),
    );
    expect(result.error).toBe(lookupError);
  });
});
describe('Authentication security: input validation', () => {
  test('normalizes email before authentication', () => {
    expect(
      authValidator.normalizeEmail(' STUDENT@EXAMPLE.COM '),
    ).toBe('student@example.com');
  });
  test.each([
    '',
    'invalid',
    'student@',
    '@example.com',
    'student@example.com extra',
  ])('rejects invalid email input %j', (email) => {
    expect(() => authValidator.normalizeEmail(email)).toThrow(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
      }),
    );
  });
  test('rejects overlong email input', () => {
    const email = `${'a'.repeat(245)}@example.com`;
    expect(() => authValidator.normalizeEmail(email)).toThrow();
  });
  test('preserves intentional password whitespace', () => {
    expect(
      authValidator.validatePassword(' secure-password '),
    ).toBe(' secure-password ');
  });
  test.each([
    '',
    'short',
    'x'.repeat(129),
    '        ',
    12345678,
    null,
  ])('rejects invalid password input', (password) => {
    expect(() => authValidator.validatePassword(password)).toThrow();
  });
  test('registration rejects privilege-escalation fields', () => {
    expect(() =>
      authValidator.validateRegister({
        name: 'Test Student',
        email: 'student@example.com',
        password: 'secure-password',
        role: 'admin',
        isAdmin: true,
        status: 'active',
      }),
    ).toThrow(
      expect.objectContaining({
        status: 400,
        code: 'UNKNOWN_FIELDS',
      }),
    );
  });
  test('login rejects extra fields', () => {
    expect(() =>
      authValidator.validateLogin({
        email: 'student@example.com',
        password: 'secure-password',
        role: 'admin',
      }),
    ).toThrow(
      expect.objectContaining({
        status: 400,
        code: 'UNKNOWN_FIELDS',
      }),
    );
  });
  test('registration rejects malformed objects', () => {
    for (const input of [null, [], 'student', 123]) {
      expect(() => authValidator.validateRegister(input)).toThrow();
    }
  });
  test('login rejects malformed objects', () => {
    for (const input of [null, [], 'student', 123]) {
      expect(() => authValidator.validateLogin(input)).toThrow();
    }
  });
});
describe('Authentication security: service behavior', () => {
  test('sanitizes secrets from user objects', () => {
    const user = {
      id: 'user-123',
      name: 'Test Student',
      email: 'student@example.com',
      role: 'student',
      password: 'plain-password',
      passwordHash: 'password-hash',
      resetToken: 'reset-token',
      resetTokenHash: 'reset-token-hash',
      verificationToken: 'verification-token',
      verificationTokenHash: 'verification-token-hash',
      refreshToken: 'refresh-token',
      accessToken: 'access-token',
      sessionToken: 'session-token',
      recoveryCode: 'recovery-code',
      recoveryCodes: ['recovery-code'],
      mfaSecret: 'mfa-secret',
      twoFactorSecret: 'two-factor-secret',
    };
    const safe = sanitizeUser(user);
    expect(safe).toEqual({
      id: 'user-123',
      name: 'Test Student',
      email: 'student@example.com',
      role: 'student',
    });
    for (const key of [
      'password',
      'passwordHash',
      'resetToken',
      'resetTokenHash',
      'verificationToken',
      'verificationTokenHash',
      'refreshToken',
      'accessToken',
      'sessionToken',
      'recoveryCode',
      'recoveryCodes',
      'mfaSecret',
      'twoFactorSecret',
    ]) {
      expect(safe).not.toHaveProperty(key);
    }
  });
  test('returns null when asked to sanitize invalid user data', () => {
    expect(sanitizeUser(null)).toBeNull();
    expect(sanitizeUser(undefined)).toBeNull();
    expect(sanitizeUser([])).toBeNull();
    expect(sanitizeUser('invalid')).toBeNull();
  });
  test('rejects duplicate registration without creating another account', async () => {
    const deps = createAuthDependencies();
    deps.userRepository.findByEmail.mockResolvedValue({
      id: 'existing-user',
    });
    await expect(
      deps.service.register({
        name: 'Test Student',
        email: 'STUDENT@example.com',
        password: 'secure-password',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_IN_USE',
    });
    expect(deps.userRepository.create).not.toHaveBeenCalled();
    expect(deps.passwordHasher.hash).not.toHaveBeenCalled();
  });
  test('normalizes email and hashes the password during registration', async () => {
    const deps = createAuthDependencies();
    const result = await deps.service.register({
      name: 'Test Student',
      email: ' STUDENT@EXAMPLE.COM ',
      password: 'secure-password',
    });
    expect(deps.userRepository.findByEmail).toHaveBeenCalledWith(
      'student@example.com',
    );
    expect(deps.passwordHasher.hash).toHaveBeenCalledWith(
      'secure-password',
    );
    expect(deps.userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'student@example.com',
        passwordHash: 'new-password-hash',
        status: 'pending_verification',
        roles: ['user'],
      }),
    );
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('resetToken');
    expect(result.user).not.toHaveProperty('refreshToken');
  });
  test('does not expose whether an email exists during login failure', async () => {
    const existing = createAuthDependencies();
    existing.passwordHasher.verify.mockResolvedValue(false);
    const missing = createAuthDependencies();
    missing.userRepository.findByEmail.mockResolvedValue(null);
    let existingError;
    let missingError;
    try {
      await existing.service.login({
        email: 'student@example.com',
        password: 'wrong-password',
      });
    } catch (error) {
      existingError = error;
    }
    try {
      await missing.service.login({
        email: 'student@example.com',
        password: 'wrong-password',
      });
    } catch (error) {
      missingError = error;
    }
    expect(existingError).toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    });
    expect(missingError).toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    });
  });
  test.each([
    'suspended',
    'disabled',
    'blocked',
    'pending',
    'pending_verification',
    'unknown',
  ])('blocks login for account status %s', async (status) => {
    const deps = createAuthDependencies();
    deps.userRepository.findByEmail.mockResolvedValue({
      ...deps.user,
      status,
    });
    await expect(
      deps.service.login({
        email: 'student@example.com',
        password: 'secure-password',
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: status === 'pending' || status === 'pending_verification'
        ? 'VERIFICATION_REQUIRED'
        : 'ACCOUNT_UNAVAILABLE',
    });
    expect(deps.tokenService.issue).not.toHaveBeenCalled();
  });
  test('creates a session before issuing tokens', async () => {
    const deps = createAuthDependencies();
    const result = await deps.service.login(
      {
        email: ' STUDENT@EXAMPLE.COM ',
        password: 'secure-password',
      },
      {
        ip: '127.0.0.1',
        userAgent: 'security-test',
      },
    );
    expect(deps.sessionService.create).toHaveBeenCalledWith(
      'user-123',
      {
        ip: '127.0.0.1',
        userAgent: 'security-test',
      },
    );
    expect(deps.tokenService.issue).toHaveBeenCalledWith({
      userId: 'user-123',
      sessionId: 'session-123',
      roles: ['student'],
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('resetToken');
  });
  test('revokes a newly created session when token issuance fails', async () => {
    const deps = createAuthDependencies();
    deps.tokenService.issue.mockRejectedValue(
      new Error('Token provider failure'),
    );
    await expect(
      deps.service.login({
        email: 'student@example.com',
        password: 'secure-password',
      }),
    ).rejects.toThrow('Token provider failure');
    expect(deps.sessionService.revoke).toHaveBeenCalledWith(
      'session-123',
      'user-123',
    );
  });
  test('does not create a session when credentials are invalid', async () => {
    const deps = createAuthDependencies();
    deps.passwordHasher.verify.mockResolvedValue(false);
    await expect(
      deps.service.login({
        email: 'student@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(deps.sessionService.create).not.toHaveBeenCalled();
    expect(deps.tokenService.issue).not.toHaveBeenCalled();
  });
  test('rejects refresh tokens when refresh is not configured', async () => {
    const deps = createAuthDependencies({
      tokenService: {
        issue: jest.fn().mockResolvedValue({
          accessToken: 'access-token',
        }),
      },
    });
    await expect(
      deps.service.refresh({
        refreshToken: 'refresh-token',
      }),
    ).rejects.toMatchObject({
      status: 501,
      code: 'TOKEN_REFRESH_UNAVAILABLE',
    });
  });
  test('rejects missing refresh tokens', async () => {
    const deps = createAuthDependencies();
    await expect(
      deps.service.refresh({}),
    ).rejects.toThrow();
  });
  test('requires configured session revocation for session logout', async () => {
    const deps = createAuthDependencies({
      sessionService: null,
    });
    await expect(
      deps.service.logout({
        userId: 'user-123',
        sessionId: 'session-123',
      }),
    ).rejects.toMatchObject({
      status: 501,
      code: 'SESSION_REVOCATION_UNAVAILABLE',
    });
  });
  test('revokes both session and refresh token on logout', async () => {
    const deps = createAuthDependencies();
    await expect(
      deps.service.logout({
        userId: 'user-123',
        sessionId: 'session-123',
        refreshToken: 'refresh-token',
      }),
    ).resolves.toEqual({
      loggedOut: true,
    });
    expect(deps.sessionService.revoke).toHaveBeenCalledWith(
      'session-123',
      'user-123',
    );
    expect(deps.tokenService.revoke).toHaveBeenCalledWith(
      'refresh-token',
    );
  });
});
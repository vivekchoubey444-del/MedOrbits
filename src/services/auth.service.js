
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredString,
  requiredId,
  assertFound,
  audit,
} = require('./service-utils');

const BLOCKED_USER_FIELDS = new Set([
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
]);

function sanitizeUser(user) {
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    return null;
  }

  const safe = {};

  for (const [key, value] of Object.entries(user)) {
    if (!BLOCKED_USER_FIELDS.has(key)) {
      safe[key] = value;
    }
  }

  return safe;
}

function createAuthService({
  userRepository,
  passwordHasher,
  tokenService,
  sessionService,
  auditService,
  verificationService,
}) {
  requireDependency(userRepository, 'userRepository');
  requireDependency(passwordHasher, 'passwordHasher');
  requireDependency(tokenService, 'tokenService');

  if (typeof userRepository.create !== 'function') {
    throw new TypeError(
      'userRepository must implement create().'
    );
  }

  if (typeof passwordHasher.hash !== 'function') {
    throw new TypeError(
      'passwordHasher must implement hash().'
    );
  }

  if (typeof passwordHasher.verify !== 'function') {
    throw new TypeError(
      'passwordHasher must implement verify().'
    );
  }

  if (typeof tokenService.issue !== 'function') {
    throw new TypeError(
      'tokenService must implement issue().'
    );
  }

  function normalizeEmail(value) {
    return requiredString(value, 'email', {
      max: 254,
    }).toLowerCase();
  }

  async function findUserByEmail(email) {
    if (typeof userRepository.findByEmail !== 'function') {
      throw new TypeError(
        'userRepository must implement findByEmail().'
      );
    }

    return userRepository.findByEmail(email);
  }

  function assertAccountCanLogin(user) {
    if (
      user.status === 'suspended' ||
      user.status === 'disabled' ||
      user.status === 'blocked'
    ) {
      throw new ServiceError(
        'This account is unavailable.',
        {
          code: 'ACCOUNT_UNAVAILABLE',
          status: 403,
        }
      );
    }

    if (
      user.status === 'pending_verification' ||
      user.status === 'pending'
    ) {
      throw new ServiceError(
        'Verify your email before signing in.',
        {
          code: 'VERIFICATION_REQUIRED',
          status: 403,
        }
      );
    }

    if (user.status !== 'active') {
      throw new ServiceError(
        'This account is unavailable.',
        {
          code: 'ACCOUNT_UNAVAILABLE',
          status: 403,
        }
      );
    }
  }

  return {
    async register(input = {}) {
      const email = normalizeEmail(input.email);
      const password = requiredString(
        input.password,
        'password',
        { min: 10, max: 200 }
      );
      const name = requiredString(input.name, 'name', {
        max: 120,
      });

      const existing = await findUserByEmail(email);

      if (existing) {
        throw new ServiceError(
          'An account with this email already exists.',
          {
            code: 'EMAIL_IN_USE',
            status: 409,
          }
        );
      }

      const passwordHash = await passwordHasher.hash(password);

      const user = assertFound(
        await userRepository.create({
          email,
          passwordHash,
          name,
          status: 'pending_verification',
          roles: ['user'],
        }),
        'User'
      );

      let verificationRequired = false;

      if (
        verificationService &&
        typeof verificationService.sendEmailVerification ===
          'function'
      ) {
        verificationRequired = true;

        try {
          await verificationService.sendEmailVerification(user);
        } catch {
          // Do not return credentials or verification tokens.
          // The account remains pending and can use a resend flow.
        }
      }

      await audit(auditService, {
        action: 'auth.registered',
        entity: 'User',
        entityId: user.id,
        actorId: user.id,
        metadata: {
          verificationRequired,
        },
      });

      return {
        user: sanitizeUser(user),
        verificationRequired,
      };
    },

    async login(input = {}, context = {}) {
      const email = normalizeEmail(input.email);
      const password = requiredString(
        input.password,
        'password',
        { max: 200 }
      );

      const user = await findUserByEmail(email);

      // Use a production password hasher with a dummy hash for
      // unknown accounts if timing resistance is required.
      if (
        !user ||
        !user.passwordHash ||
        !(await passwordHasher.verify(
          password,
          user.passwordHash
        ))
      ) {
        throw new ServiceError(
          'Email or password is incorrect.',
          {
            code: 'INVALID_CREDENTIALS',
            status: 401,
          }
        );
      }

      assertAccountCanLogin(user);

      let session = null;

      if (sessionService) {
        if (typeof sessionService.create !== 'function') {
          throw new TypeError(
            'sessionService must implement create().'
          );
        }

        session = assertFound(
          await sessionService.create(user.id, context),
          'Session'
        );
      }

      let tokens;

      try {
        tokens = await tokenService.issue({
          userId: user.id,
          sessionId: session?.id,
          roles: Array.isArray(user.roles) ? user.roles : [],
        });

        if (!tokens || typeof tokens !== 'object') {
          throw new TypeError(
            'tokenService.issue() must return a token object.'
          );
        }
      } catch (error) {
        // Avoid leaving a newly created session active when
        // token issuance fails.
        if (session?.id && sessionService?.revoke) {
          try {
            await sessionService.revoke(session.id, user.id);
          } catch {
            // Session cleanup should also be monitored operationally.
          }
        }

        throw error;
      }

      await audit(auditService, {
        action: 'auth.login',
        entity: 'User',
        entityId: user.id,
        actorId: user.id,
        metadata: {
          sessionId: session?.id,
        },
      });

      return {
        user: sanitizeUser(user),
        session,
        ...tokens,
      };
    },

    async refresh(input = {}) {
      if (typeof tokenService.refresh !== 'function') {
        throw new ServiceError(
          'Token refresh is not configured.',
          {
            code: 'TOKEN_REFRESH_UNAVAILABLE',
            status: 501,
          }
        );
      }

      const refreshToken = requiredString(
        input.refreshToken,
        'refreshToken',
        { max: 4096 }
      );

      return tokenService.refresh(refreshToken);
    },

    async logout({
      userId,
      sessionId,
      refreshToken,
    } = {}) {
      if (sessionId != null) {
        requiredId(sessionId, 'sessionId');

        if (
          !sessionService ||
          typeof sessionService.revoke !== 'function'
        ) {
          throw new ServiceError(
            'Session revocation is not configured.',
            {
              code: 'SESSION_REVOCATION_UNAVAILABLE',
              status: 501,
            }
          );
        }

        requiredId(userId, 'userId');
        await sessionService.revoke(sessionId, userId);
      }

      if (refreshToken != null) {
        const token = requiredString(
          refreshToken,
          'refreshToken',
          { max: 4096 }
        );

        if (typeof tokenService.revoke !== 'function') {
          throw new ServiceError(
            'Token revocation is not configured.',
            {
              code: 'TOKEN_REVOCATION_UNAVAILABLE',
              status: 501,
            }
          );
        }

        await tokenService.revoke(token);
      }

      if (userId != null) {
        await audit(auditService, {
          action: 'auth.logout',
          entity: 'User',
          entityId: userId,
          actorId: userId,
          metadata: {
            sessionRevoked: sessionId != null,
            refreshTokenRevoked: refreshToken != null,
          },
        });
      }

      return {
        loggedOut: true,
      };
    },
  };
}

module.exports = {
  createAuthService,
  sanitizeUser,
};

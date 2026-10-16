
'use strict';

const crypto = require('node:crypto');

const {
  ServiceError,
  requireDependency,
  requiredId,
  requiredString,
  assertFound,
  audit,
} = require('./service-utils');

const DEFAULT_TOKEN_TTL_MS = 30 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 200;

function createPasswordService({
  userRepository,
  passwordResetRepository,
  passwordHasher,
  emailService,
  sessionService,
  auditService,
  tokenTtlMs = DEFAULT_TOKEN_TTL_MS,
}) {
  requireDependency(userRepository, 'userRepository');
  requireDependency(passwordResetRepository, 'passwordResetRepository');
  requireDependency(passwordHasher, 'passwordHasher');

  if (
    !Number.isSafeInteger(tokenTtlMs) ||
    tokenTtlMs <= 0
  ) {
    throw new TypeError('tokenTtlMs must be a positive integer.');
  }

  function hashToken(token) {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  function invalidTokenError() {
    return new ServiceError(
      'Password reset token is invalid, expired, or already used.',
      {
        code: 'TOKEN_INVALID',
        status: 400,
      },
    );
  }

  function validatePassword(value, field = 'password') {
    return requiredString(value, field, {
      min: MIN_PASSWORD_LENGTH,
      max: MAX_PASSWORD_LENGTH,
    });
  }

  async function revokeSessions(userId) {
    if (typeof sessionService?.revokeAllForUser === 'function') {
      await sessionService.revokeAllForUser(userId);
    }
  }

  return {
    async requestReset(email) {
      const normalizedEmail = requiredString(email, 'email', {
        max: 254,
      }).toLowerCase();

      const user = await userRepository.findByEmail(normalizedEmail);

      // Keep the public response identical for existing and unknown users.
      if (!user) {
        return { accepted: true };
      }

      if (typeof emailService?.sendPasswordResetEmail !== 'function') {
        // Avoid creating reset tokens that cannot be delivered.
        throw new ServiceError(
          'Password reset delivery is temporarily unavailable.',
          {
            code: 'EMAIL_NOT_CONFIGURED',
            status: 503,
          },
        );
      }

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + tokenTtlMs);

      await passwordResetRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        consumedAt: null,
      });

      try {
        await emailService.sendPasswordResetEmail({
          to: user.email,
          name: user.name || '',
          token,
          expiresAt,
          expiryMinutes: Math.ceil(tokenTtlMs / 60000),
        });
      } catch {
        throw new ServiceError(
          'Unable to send the password reset email. Please try again later.',
          {
            code: 'EMAIL_DELIVERY_FAILED',
            status: 503,
          },
        );
      }

      return { accepted: true };
    },

    async reset(input = {}) {
      const token = requiredString(input.token, 'token', {
        max: 256,
      });

      const password = validatePassword(input.password);

      const tokenHash = hashToken(token);
      const reset = assertFound(
        await passwordResetRepository.findValidByHash(tokenHash),
        'Password reset token',
      );

      const now = new Date();

      if (
        reset.consumedAt ||
        !reset.expiresAt ||
        Number.isNaN(new Date(reset.expiresAt).getTime()) ||
        new Date(reset.expiresAt) <= now
      ) {
        throw invalidTokenError();
      }

      const passwordHash = await passwordHasher.hash(password);

      /*
       * Production requirement:
       * Consume the reset token and update the user's password in a
       * single database transaction. The sequential operations below
       * retain your existing repository interface but are not atomic.
       */
      const updatedUser = assertFound(
        await userRepository.updateById(reset.userId, {
          passwordHash,
          passwordChangedAt: now,
        }),
        'User',
      );

      assertFound(
        await passwordResetRepository.updateById(reset.id, {
          consumedAt: now,
        }),
        'Password reset token',
      );

      await revokeSessions(updatedUser.id);

      await audit(auditService, {
        action: 'password.reset',
        entity: 'User',
        entityId: updatedUser.id,
        actorId: updatedUser.id,
      });

      return { passwordReset: true };
    },

    async change(userId, input = {}) {
      requiredId(userId, 'userId');

      const currentPassword = requiredString(
        input.currentPassword,
        'currentPassword',
        { max: MAX_PASSWORD_LENGTH },
      );

      const newPassword = validatePassword(
        input.newPassword,
        'newPassword',
      );

      if (currentPassword === newPassword) {
        throw new ServiceError(
          'New password must differ from the current password.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          },
        );
      }

      const user = assertFound(
        await userRepository.findById(userId),
        'User',
      );

      if (!user.passwordHash) {
        throw new ServiceError(
          'Password authentication is unavailable for this account.',
          {
            code: 'PASSWORD_NOT_CONFIGURED',
            status: 409,
          },
        );
      }

      const valid = await passwordHasher.verify(
        currentPassword,
        user.passwordHash,
      );

      if (!valid) {
        throw new ServiceError('Current password is incorrect.', {
          code: 'INVALID_CREDENTIALS',
          status: 401,
        });
      }

      const passwordHash = await passwordHasher.hash(newPassword);
      const now = new Date();

      assertFound(
        await userRepository.updateById(userId, {
          passwordHash,
          passwordChangedAt: now,
        }),
        'User',
      );

      await revokeSessions(userId);

      await audit(auditService, {
        action: 'password.changed',
        entity: 'User',
        entityId: userId,
        actorId: userId,
      });

      return { passwordChanged: true };
    },
  };
}

module.exports = { createPasswordService };

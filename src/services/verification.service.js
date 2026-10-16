
'use strict';

const crypto = require('node:crypto');

const {
  ServiceError,
  requireDependency,
  requiredString,
  audit,
} = require('./service-utils');

const DEFAULT_TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_TOKEN_LENGTH = 256;

function createVerificationService({
  userRepository,
  verificationRepository,
  emailService,
  auditService,
  tokenTtlMs = DEFAULT_TOKEN_TTL_MS,
}) {
  requireDependency(userRepository, 'userRepository');
  requireDependency(verificationRepository, 'verificationRepository');

  if (!Number.isFinite(tokenTtlMs) || tokenTtlMs <= 0) {
    throw new TypeError('tokenTtlMs must be a positive finite number.');
  }

  function createToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  function invalidTokenError() {
    return new ServiceError(
      'Verification token is invalid, expired, or already used.',
      {
        code: 'TOKEN_INVALID',
        status: 400,
      },
    );
  }

  return {
    async sendEmailVerification(user) {
      if (!user || !user.id || !user.email) {
        throw new ServiceError('A valid user is required.', {
          code: 'INVALID_USER',
          status: 400,
        });
      }

      if (typeof emailService?.sendVerificationEmail !== 'function') {
        throw new ServiceError('Email delivery is not configured.', {
          code: 'EMAIL_NOT_CONFIGURED',
          status: 503,
        });
      }

      if (user.status !== 'pending_verification') {
        throw new ServiceError(
          'This account is not awaiting email verification.',
          {
            code: 'VERIFICATION_NOT_REQUIRED',
            status: 409,
          },
        );
      }

      const token = createToken();
      const tokenHash = hashToken(token);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + tokenTtlMs);

      await verificationRepository.create({
        userId: user.id,
        tokenHash,
        type: 'email',
        expiresAt,
        consumedAt: null,
      });

      try {
        await emailService.sendVerificationEmail({
          to: user.email,
          name: user.name || '',
          token,
          expiresAt,
          expiryMinutes: Math.ceil(tokenTtlMs / 60000),
        });
      } catch (error) {
        // Do not expose internal delivery details to public callers.
        // The stored token expires automatically; repositories may also
        // invalidate it here if they support a dedicated operation.
        throw new ServiceError(
          'Unable to send the verification email. Please try again later.',
          {
            code: 'EMAIL_DELIVERY_FAILED',
            status: 503,
          },
        );
      }

      return { sent: true };
    },

    async verifyEmail(input) {
      const token = requiredString(input?.token, 'token', {
        max: MAX_TOKEN_LENGTH,
      });

      const tokenHash = hashToken(token);
      const now = new Date();

      /*
       * REQUIRED repository contract:
       *
       * consumeValidTokenAndActivateUser(tokenHash, now)
       *
       * It must atomically:
       * 1. Find an unconsumed, unexpired email-verification token.
       * 2. Mark that token consumed.
       * 3. Activate the associated user and set emailVerifiedAt.
       * 4. Commit all changes in one database transaction.
       *
       * Return the updated user, or null if the token is invalid,
       * expired, already consumed, or otherwise unusable.
       */
      if (
        typeof verificationRepository
          .consumeValidTokenAndActivateUser !== 'function'
      ) {
        throw new ServiceError(
          'Atomic email verification is not configured.',
          {
            code: 'VERIFICATION_REPOSITORY_MISCONFIGURED',
            status: 500,
          },
        );
      }

      const user = await verificationRepository
        .consumeValidTokenAndActivateUser(tokenHash, now);

      if (!user) {
        throw invalidTokenError();
      }

      try {
        await audit(auditService, {
          action: 'verification.email_verified',
          entity: 'User',
          entityId: user.id,
          actorId: user.id,
        });
      } catch (error) {
        // Verification has already committed. Do not report it as failed
        // merely because the audit service is temporarily unavailable.
        // Configure operational monitoring for audit delivery failures.
      }

      return {
        verified: true,
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      };
    },

    async resendEmailVerification(email) {
      const normalizedEmail = requiredString(email, 'email', {
        max: 254,
      }).trim().toLowerCase();

      const user = await userRepository.findByEmail(normalizedEmail);

      // Keep the response identical for unknown and ineligible accounts.
      if (user && user.status === 'pending_verification') {
        await this.sendEmailVerification(user);
      }

      return { accepted: true };
    },
  };
}

module.exports = { createVerificationService };

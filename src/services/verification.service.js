'use strict';
const crypto = require('node:crypto');
const { ServiceError, requireDependency, requiredString, assertFound, audit } = require('./service-utils');
function createVerificationService({ userRepository, verificationRepository, emailService, auditService, tokenTtlMs = 30 * 60 * 1000 }) {
  requireDependency(userRepository, 'userRepository'); requireDependency(verificationRepository, 'verificationRepository');
  return {
    async sendEmailVerification(user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await verificationRepository.create({ userId: user.id, tokenHash, type: 'email', expiresAt: new Date(Date.now() + tokenTtlMs), consumedAt: null });
      if (!emailService?.sendVerificationEmail) throw new ServiceError('Email delivery is not configured.', { code: 'EMAIL_NOT_CONFIGURED', status: 503 });
      await emailService.sendVerificationEmail({ to: user.email, name: user.name, token });
      return { sent: true };
    },
    async verifyEmail(input) {
      const token = requiredString(input?.token, 'token', { max: 256 });
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const record = assertFound(await verificationRepository.findValidByHash(tokenHash, 'email'), 'Verification token');
      if (record.consumedAt || new Date(record.expiresAt) <= new Date()) throw new ServiceError('Verification token is invalid or expired.', { code: 'TOKEN_INVALID', status: 400 });
      await verificationRepository.updateById(record.id, { consumedAt: new Date() });
      const user = assertFound(await userRepository.updateById(record.userId, { status: 'active', emailVerifiedAt: new Date() }), 'User');
      await audit(auditService, { action: 'verification.email_verified', entity: 'User', entityId: user.id, actorId: user.id });
      return { verified: true, user: { id: user.id, email: user.email, status: user.status } };
    },
    async resendEmailVerification(email) {
      const normalized = requiredString(email, 'email', { max: 254 }).toLowerCase();
      const user = await userRepository.findByEmail(normalized);
      // Do not reveal whether an email address exists.
      if (user && user.status === 'pending_verification') await this.sendEmailVerification(user);
      return { accepted: true };
    },
  };
}
module.exports = { createVerificationService };

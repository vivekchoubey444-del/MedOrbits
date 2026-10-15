'use strict';
const crypto = require('node:crypto');
const { ServiceError, requireDependency, requiredString, assertFound, audit } = require('./service-utils');
function createPasswordService({ userRepository, passwordResetRepository, passwordHasher, emailService, sessionService, auditService, tokenTtlMs = 30 * 60 * 1000 }) {
  requireDependency(userRepository, 'userRepository'); requireDependency(passwordResetRepository, 'passwordResetRepository'); requireDependency(passwordHasher, 'passwordHasher');
  return {
    async requestReset(email) {
      const normalized = requiredString(email, 'email', { max: 254 }).toLowerCase();
      const user = await userRepository.findByEmail(normalized);
      if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await passwordResetRepository.create({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + tokenTtlMs), consumedAt: null });
        if (emailService?.sendPasswordResetEmail) await emailService.sendPasswordResetEmail({ to: user.email, name: user.name, token });
      }
      return { accepted: true }; // Same response whether or not the account exists.
    },
    async reset(input) {
      const token = requiredString(input?.token, 'token', { max: 256 });
      const password = requiredString(input?.password, 'password', { min: 10, max: 200 });
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const reset = assertFound(await passwordResetRepository.findValidByHash(tokenHash), 'Password reset token');
      if (reset.consumedAt || new Date(reset.expiresAt) <= new Date()) throw new ServiceError('Reset token is invalid or expired.', { code: 'TOKEN_INVALID', status: 400 });
      const passwordHash = await passwordHasher.hash(password);
      await userRepository.updateById(reset.userId, { passwordHash, passwordChangedAt: new Date() });
      await passwordResetRepository.updateById(reset.id, { consumedAt: new Date() });
      if (sessionService?.revokeAllForUser) await sessionService.revokeAllForUser(reset.userId);
      await audit(auditService, { action: 'password.reset', entity: 'User', entityId: reset.userId, actorId: reset.userId });
      return { passwordReset: true };
    },
    async change(userId, input) {
      const currentPassword = requiredString(input?.currentPassword, 'currentPassword', { max: 200 });
      const newPassword = requiredString(input?.newPassword, 'newPassword', { min: 10, max: 200 });
      const user = assertFound(await userRepository.findById(userId), 'User');
      if (!(await passwordHasher.verify(currentPassword, user.passwordHash))) throw new ServiceError('Current password is incorrect.', { code: 'INVALID_CREDENTIALS', status: 401 });
      if (currentPassword === newPassword) throw new ServiceError('New password must differ from the current password.', { code: 'VALIDATION_ERROR', status: 422 });
      await userRepository.updateById(userId, { passwordHash: await passwordHasher.hash(newPassword), passwordChangedAt: new Date() });
      if (sessionService?.revokeAllForUser) await sessionService.revokeAllForUser(userId);
      await audit(auditService, { action: 'password.changed', entity: 'User', entityId: userId, actorId: userId });
      return { passwordChanged: true };
    },
  };
}
module.exports = { createPasswordService };

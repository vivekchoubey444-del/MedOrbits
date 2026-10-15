'use strict';
const { ServiceError, requireDependency, requiredString, assertFound, audit } = require('./service-utils');

function createAuthService({ userRepository, passwordHasher, tokenService, sessionService, auditService, verificationService }) {
  requireDependency(userRepository, 'userRepository');
  requireDependency(passwordHasher, 'passwordHasher');
  requireDependency(tokenService, 'tokenService');
  return {
    async register(input) {
      const email = requiredString(input?.email, 'email', { max: 254 }).toLowerCase();
      const password = requiredString(input?.password, 'password', { min: 10, max: 200 });
      if (typeof userRepository.findByEmail === 'function' && await userRepository.findByEmail(email)) throw new ServiceError('An account with this email already exists.', { code: 'EMAIL_IN_USE', status: 409 });
      const passwordHash = await passwordHasher.hash(password);
      const user = await userRepository.create({ email, passwordHash, name: requiredString(input?.name, 'name', { max: 120 }), status: 'pending_verification' });
      if (verificationService?.sendEmailVerification) await verificationService.sendEmailVerification(user);
      await audit(auditService, { action: 'auth.registered', entity: 'User', entityId: user.id, actorId: user.id });
      return { user: sanitizeUser(user), verificationRequired: Boolean(verificationService) };
    },
    async login(input, context = {}) {
      const email = requiredString(input?.email, 'email', { max: 254 }).toLowerCase();
      const password = requiredString(input?.password, 'password', { max: 200 });
      const user = typeof userRepository.findByEmail === 'function' ? await userRepository.findByEmail(email) : null;
      const valid = user && user.passwordHash && await passwordHasher.verify(password, user.passwordHash);
      if (!valid) throw new ServiceError('Email or password is incorrect.', { code: 'INVALID_CREDENTIALS', status: 401 });
      if (user.status === 'suspended' || user.status === 'disabled') throw new ServiceError('This account is unavailable.', { code: 'ACCOUNT_UNAVAILABLE', status: 403 });
      if (user.status === 'pending_verification') throw new ServiceError('Verify your email before signing in.', { code: 'VERIFICATION_REQUIRED', status: 403 });
      const session = sessionService ? await sessionService.create(user.id, context) : null;
      const tokens = await tokenService.issue({ userId: user.id, sessionId: session?.id, roles: user.roles || [] });
      await audit(auditService, { action: 'auth.login', entity: 'User', entityId: user.id, actorId: user.id, metadata: { sessionId: session?.id } });
      return { user: sanitizeUser(user), session, ...tokens };
    },
    async refresh(input) {
      if (typeof tokenService.refresh !== 'function') throw new ServiceError('Token refresh is not configured.', { status: 501 });
      return tokenService.refresh(requiredString(input?.refreshToken, 'refreshToken', { max: 4096 }));
    },
    async logout({ userId, sessionId, refreshToken } = {}) {
      if (sessionId && sessionService) await sessionService.revoke(sessionId, userId);
      if (refreshToken && typeof tokenService.revoke === 'function') await tokenService.revoke(refreshToken);
      await audit(auditService, { action: 'auth.logout', entity: 'User', entityId: userId, actorId: userId });
      return { loggedOut: true };
    },
  };
}
function sanitizeUser(user) { const { passwordHash, password, resetToken, ...safe } = user || {}; return safe; }
module.exports = { createAuthService, sanitizeUser };

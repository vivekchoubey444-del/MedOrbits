'use strict';
const { createCrudService, requiredId, requiredString, assertFound, audit } = require('./service-utils');
function createUserService({ userRepository, auditService }) {
  const crud = createCrudService({ repository: userRepository, entity: 'User', auditService, allowedSort: ['createdAt', 'updatedAt', 'name', 'email'] });
  return { ...crud,
    async getProfile(id) { const user = assertFound(await userRepository.findById(id), 'User'); const { passwordHash, resetToken, ...safe } = user; return safe; },
    async updateProfile(id, input, actor = {}) { requiredId(id); const data = { ...input }; delete data.role; delete data.roles; delete data.status; delete data.passwordHash; delete data.emailVerifiedAt; delete data.isAdmin; if (data.name !== undefined) data.name = requiredString(data.name, 'name', { max: 120 }); const result = assertFound(await userRepository.updateById(id, data), 'User'); await audit(auditService, { action: 'user.profile_updated', entity: 'User', entityId: id, actorId: actor.id }); const { passwordHash, ...safe } = result; return safe; },
    async setStatus(id, status, actor = {}) { if (!['active', 'suspended', 'disabled', 'pending_verification'].includes(status)) throw new Error('Unsupported user status.'); const result = assertFound(await userRepository.updateById(id, { status }), 'User'); await audit(auditService, { action: 'user.status_changed', entity: 'User', entityId: id, actorId: actor.id, metadata: { status } }); return result; }
  };
}
module.exports = { createUserService };

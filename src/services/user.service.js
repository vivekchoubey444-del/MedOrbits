
'use strict';

const {
  createCrudService,
  requiredId,
  requiredString,
  assertFound,
  audit,
} = require('./service-utils');

const ALLOWED_STATUSES = new Set([
  'active',
  'suspended',
  'disabled',
  'pending_verification',
]);

const BLOCKED_PROFILE_FIELDS = [
  'id',
  'role',
  'roles',
  'status',
  'password',
  'passwordHash',
  'resetToken',
  'resetTokenHash',
  'emailVerifiedAt',
  'isAdmin',
  'createdAt',
  'updatedAt',
];

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const {
    password,
    passwordHash,
    resetToken,
    resetTokenHash,
    verificationToken,
    verificationTokenHash,
    ...safe
  } = user;

  return safe;
}

function createUserService({ userRepository, auditService }) {
  if (!userRepository) {
    throw new TypeError('userRepository is required.');
  }

  const crud = createCrudService({
    repository: userRepository,
    entity: 'User',
    auditService,
    allowedSort: ['createdAt', 'updatedAt', 'name', 'email'],
  });

  return {
    ...crud,

    async getProfile(id) {
      requiredId(id);

      const user = assertFound(
        await userRepository.findById(id),
        'User',
      );

      return sanitizeUser(user);
    },

    async updateProfile(id, input, actor = {}) {
      requiredId(id);

      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new TypeError('Profile input must be an object.');
      }

      const data = { ...input };

      for (const field of BLOCKED_PROFILE_FIELDS) {
        delete data[field];
      }

      if (data.name !== undefined) {
        data.name = requiredString(data.name, 'name', {
          max: 120,
        }).trim();
      }

      if (data.email !== undefined) {
        throw new Error(
          'Email changes must use the dedicated email-change verification flow.',
        );
      }

      const result = assertFound(
        await userRepository.updateById(id, data),
        'User',
      );

      await audit(auditService, {
        action: 'user.profile_updated',
        entity: 'User',
        entityId: id,
        actorId: actor.id,
      });

      return sanitizeUser(result);
    },

    async setStatus(id, status, actor = {}) {
      requiredId(id);

      if (!ALLOWED_STATUSES.has(status)) {
        throw new TypeError('Unsupported user status.');
      }

      const result = assertFound(
        await userRepository.updateById(id, { status }),
        'User',
      );

      await audit(auditService, {
        action: 'user.status_changed',
        entity: 'User',
        entityId: id,
        actorId: actor.id,
        metadata: { status },
      });

      return sanitizeUser(result);
    },
  };
}

module.exports = { createUserService };

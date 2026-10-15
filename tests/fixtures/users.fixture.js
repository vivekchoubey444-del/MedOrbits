'use strict';

// Synthetic fixture factory. Adapt fields to the actual user model.
function makeUser(overrides = {}) {
  return {
    id: 'test-user-001',
    email: 'student@example.test',
    role: 'student',
    emailVerified: true,
    ...overrides,
  };
}

module.exports = { makeUser };

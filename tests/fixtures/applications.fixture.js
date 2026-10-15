'use strict';

// Synthetic fixture factory. Do not use real applicant information.
function makeApplication(overrides = {}) {
  return {
    id: 'test-application-001',
    userId: 'test-user-001',
    status: 'draft',
    ...overrides,
  };
}

module.exports = { makeApplication };

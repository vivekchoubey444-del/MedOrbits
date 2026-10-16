
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createApplicationService,
} = require('../../../src/services/application.service');

const {
  ServiceError,
} = require('../../../src/services/service-utils');

function createMocks(options = {}) {
  const records = new Map();

  records.set('app-001', {
    id: 'app-001',
    applicantId: 'user-001',
    courseId: 'course-001',
    status: 'draft',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...options.initialRecord,
  });

  const auditEvents = [];

  const repository = {
    findById: async (id) => {
      if (options.findByIdError) {
        throw options.findByIdError;
      }

      return records.get(String(id)) || null;
    },

    getById: async (id) =>
      records.get(String(id)) || null,

    updateById: async (id, changes) => {
      if (options.updateError) {
        throw options.updateError;
      }

      const existing = records.get(String(id));

      if (!existing) {
        return null;
      }

      const updated = {
        ...existing,
        ...changes,
      };

      records.set(String(id), updated);
      return updated;
    },

    create: async (input) => {
      if (options.createError) {
        throw options.createError;
      }

      const id = input.id || 'app-created';

      if (records.has(String(id))) {
        throw new Error('Duplicate application');
      }

      const record = {
        ...input,
        id,
      };

      records.set(String(id), record);
      return record;
    },

    list: async () => [...records.values()],

    deleteById: async (id) => records.delete(String(id)),

    ...options.repository,
  };

  const auditService = {
    record: async (event) => {
      auditEvents.push(event);

      if (options.auditError) {
        throw options.auditError;
      }
    },
    ...options.auditService,
  };

  const service = createApplicationService({
    applicationRepository: repository,
    auditService,
  });

  return {
    service,
    repository,
    auditService,
    auditEvents,
    records,
  };
}

const applicant = {
  id: 'user-001',
  isAdmin: false,
};

const administrator = {
  id: 'admin-001',
  isAdmin: true,
};

function getErrorCode(error) {
  return error && error.code;
}

test('creates the application service', () => {
  const { service } = createMocks();

  assert.equal(typeof service.submit, 'function');
  assert.equal(typeof service.setStatus, 'function');
  assert.equal(typeof service.getById, 'function');
  assert.equal(typeof service.create, 'function');
});

test('submits a draft application owned by the applicant', async () => {
  const { service, records, auditEvents } = createMocks();

  const result = await service.submit('app-001', applicant);

  assert.equal(result.status, 'submitted');
  assert.equal(result.applicantId, applicant.id);
  assert.ok(result.submittedAt instanceof Date);
  assert.ok(result.updatedAt instanceof Date);

  assert.equal(
    records.get('app-001').status,
    'submitted'
  );

  assert.equal(auditEvents.length, 1);
  assert.equal(
    auditEvents[0].action,
    'application.submitted'
  );
  assert.equal(auditEvents[0].actorId, applicant.id);
  assert.equal(
    auditEvents[0].metadata.previousStatus,
    'draft'
  );
  assert.equal(
    auditEvents[0].metadata.status,
    'submitted'
  );
});

test('rejects submission without an actor ID', async () => {
  const { service } = createMocks();

  await assert.rejects(
    service.submit('app-001', {}),
    (error) => error instanceof ServiceError
  );
});

test('rejects submission with an invalid application ID', async () => {
  const { service } = createMocks();

  await assert.rejects(
    service.submit('', applicant),
    (error) => error instanceof ServiceError
  );
});

test('conceals applications owned by another user', async () => {
  const { service } = createMocks();

  await assert.rejects(
    service.submit('app-001', {
      id: 'user-002',
      isAdmin: false,
    }),
    (error) => {
      assert.equal(getErrorCode(error), 'NOT_FOUND');
      assert.equal(error.status, 404);
      return true;
    }
  );
});

test('rejects unauthenticated status changes', async () => {
  const { service } = createMocks();

  await assert.rejects(
    service.setStatus('app-001', 'withdrawn', {}),
    (error) => {
      assert.equal(getErrorCode(error), 'NOT_FOUND');
      return true;
    }
  );
});

test('rejects unsupported application statuses', async () => {
  const { service } = createMocks();

  await assert.rejects(
    service.setStatus('app-001', 'pending', applicant),
    (error) => {
      assert.equal(getErrorCode(error), 'VALIDATION_ERROR');
      assert.equal(error.status, 422);
      assert.ok(error.details.allowed.includes('draft'));
      return true;
    }
  );
});

test('allows an applicant to withdraw their own draft application', async () => {
  const { service, auditEvents } = createMocks();

  const result = await service.setStatus(
    'app-001',
    'withdrawn',
    applicant
  );

  assert.equal(result.status, 'withdrawn');
  assert.equal(auditEvents.length, 1);
  assert.equal(
    auditEvents[0].action,
    'application.status_changed'
  );
});

test('allows an administrator to move an application under review', async () => {
  const { service, auditEvents } = createMocks();

  const result = await service.setStatus(
    'app-001',
    'under_review',
    administrator
  );

  assert.equal(result.status, 'under_review');
  assert.equal(auditEvents.length, 1);
  assert.equal(
    auditEvents[0].metadata.previousStatus,
    'draft'
  );
});

test('allows an administrator to approve an application', async () => {
  const { service } = createMocks({
    initialRecord: {
      status: 'under_review',
    },
  });

  const result = await service.setStatus(
    'app-001',
    'approved',
    administrator
  );

  assert.equal(result.status, 'approved');
});

test('allows an administrator to reject an application', async () => {
  const { service } = createMocks({
    initialRecord: {
      status: 'under_review',
    },
  });

  const result = await service.setStatus(
    'app-001',
    'rejected',
    administrator
  );

  assert.equal(result.status, 'rejected');
});

test('prevents an applicant from making administrative decisions', async () => {
  const { service } = createMocks();

  for (const status of [
    'under_review',
    'approved',
    'rejected',
  ]) {
    await assert.rejects(
      service.setStatus('app-001', status, applicant),
      (error) => {
        assert.equal(getErrorCode(error), 'FORBIDDEN');
        assert.equal(error.status, 403);
        return true;
      }
    );
  }
});

test('prevents administrators from submitting on behalf of another applicant', async () => {
  const { service } = createMocks();

  await assert.rejects(
    service.submit('app-001', administrator),
    (error) => {
      assert.equal(getErrorCode(error), 'FORBIDDEN');
      assert.equal(error.status, 403);
      return true;
    }
  );
});

test('rejects submission when the application is not a draft', async () => {
  const { service } = createMocks({
    initialRecord: {
      status: 'submitted',
    },
  });

  await assert.rejects(
    service.submit('app-001', applicant),
    (error) => {
      assert.equal(getErrorCode(error), 'INVALID_STATE');
      assert.equal(error.status, 409);
      return true;
    }
  );
});

test('prevents changes to a terminal application status', async () => {
  const { service } = createMocks({
    initialRecord: {
      status: 'approved',
    },
  });

  await assert.rejects(
    service.setStatus('app-001', 'withdrawn', administrator),
    (error) => {
      assert.equal(getErrorCode(error), 'INVALID_STATE');
      assert.equal(error.status, 409);
      return true;
    }
  );
});

test('returns the existing record when setting the same status', async () => {
  const { service, auditEvents } = createMocks({
    initialRecord: {
      status: 'submitted',
    },
  });

  const result = await service.setStatus(
    'app-001',
    'submitted',
    applicant
  );

  assert.equal(result.status, 'submitted');
  assert.equal(auditEvents.length, 0);
});

test('rejects submission when the application does not exist', async () => {
  const { service } = createMocks();

  await assert.rejects(
    service.submit('missing-app', applicant),
    (error) => {
      assert.equal(getErrorCode(error), 'NOT_FOUND');
      assert.equal(error.status, 404);
      return true;
    }
  );
});

test('propagates repository lookup failures', async () => {
  const { service } = createMocks({
    findByIdError: new Error('Database unavailable'),
  });

  await assert.rejects(
    service.submit('app-001', applicant),
    /Database unavailable/
  );
});

test('propagates repository update failures', async () => {
  const { service } = createMocks({
    updateError: new Error('Update failed'),
  });

  await assert.rejects(
    service.submit('app-001', applicant),
    /Update failed/
  );
});

test('does not write an audit event when updating the application fails', async () => {
  const { service, auditEvents } = createMocks({
    updateError: new Error('Update failed'),
  });

  await assert.rejects(
    service.submit('app-001', applicant),
    /Update failed/
  );

  assert.equal(auditEvents.length, 0);
});

test('does not report successful creation when the repository fails', async () => {
  const { service } = createMocks({
    createError: new Error('Insert failed'),
  });

  await assert.rejects(
    service.create({
      applicantId: 'user-001',
      courseId: 'course-001',
    }),
    /Insert failed/
  );
});

test('audit failures do not turn a successful status update into a failure', async () => {
  const { service } = createMocks({
    auditError: new Error('Audit unavailable'),
  });

  const result = await service.submit('app-001', applicant);

  assert.equal(result.status, 'submitted');
});

test('supports repository getById fallback', async () => {
  const { service } = createMocks({
    repository: {
      findById: undefined,
      getById: async () => ({
        id: 'app-001',
        applicantId: 'user-001',
        status: 'draft',
      }),
    },
  });

  const result = await service.submit('app-001', applicant);

  assert.equal(result.status, 'submitted');
});

test('rejects construction without an application repository', () => {
  assert.throws(
    () => createApplicationService({
      applicationRepository: null,
      auditService: null,
    }),
    /applicationRepository/
  );
});

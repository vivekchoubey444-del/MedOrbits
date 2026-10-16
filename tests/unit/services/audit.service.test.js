
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAuditService,
  redact,
} = require('../../../src/services/audit.service');

const FIXED_DATE = new Date('2026-10-16T10:30:00.000Z');

function createMocks({
  createResult,
  listResult,
  createError,
  listError,
  clock = () => new Date(FIXED_DATE),
} = {}) {
  const createdEntries = [];
  const listedQueries = [];

  const auditRepository = {
    async create(entry) {
      if (createError) throw createError;

      createdEntries.push(entry);

      return createResult === undefined
        ? entry
        : createResult;
    },

    async list(query) {
      if (listError) throw listError;

      listedQueries.push(query);

      return listResult === undefined
        ? { items: [], nextCursor: null }
        : listResult;
    },
  };

  const service = createAuditService({
    auditRepository,
    clock,
  });

  return {
    service,
    auditRepository,
    createdEntries,
    listedQueries,
  };
}

function expectServiceError(callback, {
  code = 'VALIDATION_ERROR',
  status = 422,
} = {}) {
  assert.throws(callback, (error) => {
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

function expectRejectedServiceError(promise, {
  code = 'VALIDATION_ERROR',
  status = 422,
} = {}) {
  return assert.rejects(promise, (error) => {
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

test('createAuditService requires an audit repository', () => {
  assert.throws(
    () => createAuditService({}),
    TypeError
  );

  assert.throws(
    () => createAuditService({
      auditRepository: {},
    }),
    /auditRepository must implement create/
  );
});

test('createAuditService requires a function clock', () => {
  assert.throws(
    () => createAuditService({
      auditRepository: {
        create: async (entry) => entry,
      },
      clock: 'not-a-function',
    }),
    /clock must be a function/
  );
});

test('record persists a normalized audit event', async () => {
  const {
    service,
    createdEntries,
  } = createMocks();

  const result = await service.record({
    action: 'application.submitted',
    entity: 'Application',
    entityId: 'APP-101',
    actorId: 'USER-12',
    requestId: 'REQ-99',
    ipAddress: '192.0.2.10',
    metadata: {
      source: 'web',
      status: 'submitted',
    },
  });

  assert.equal(createdEntries.length, 1);

  assert.deepEqual(createdEntries[0], {
    action: 'application.submitted',
    entity: 'Application',
    entityId: 'APP-101',
    actorId: 'USER-12',
    requestId: 'REQ-99',
    ipAddress: '192.0.2.10',
    metadata: {
      source: 'web',
      status: 'submitted',
    },
    createdAt: FIXED_DATE,
  });

  assert.equal(result, createdEntries[0]);
});

test('record normalizes omitted optional fields to null or empty metadata', async () => {
  const {
    service,
    createdEntries,
  } = createMocks();

  await service.record({
    action: 'user.created',
  });

  assert.deepEqual(createdEntries[0], {
    action: 'user.created',
    entity: null,
    entityId: null,
    actorId: null,
    requestId: null,
    ipAddress: null,
    metadata: {},
    createdAt: FIXED_DATE,
  });
});

test('record accepts numeric IDs and normalizes them to strings', async () => {
  const {
    service,
    createdEntries,
  } = createMocks();

  await service.record({
    action: 'user.updated',
    entityId: 123,
    actorId: 456,
    requestId: 789,
  });

  assert.equal(createdEntries[0].entityId, '123');
  assert.equal(createdEntries[0].actorId, '456');
  assert.equal(createdEntries[0].requestId, '789');
});

test('record accepts a zero-argument event with an action', async () => {
  const {
    service,
    createdEntries,
  } = createMocks();

  await service.record({
    action: 'system.started',
  });

  assert.equal(createdEntries[0].action, 'system.started');
});

test('record rejects null, primitive, and array events', async (t) => {
  const { service } = createMocks();

  for (const value of [null, undefined, 'event', 123, []]) {
    await t.test(`rejects ${String(value)}`, async () => {
      await expectRejectedServiceError(
        service.record(value)
      );
    });
  }
});

test('record rejects a missing or blank action', async (t) => {
  const { service } = createMocks();

  for (const action of [undefined, null, '', '   ']) {
    await t.test(`rejects action ${String(action)}`, async () => {
      await expectRejectedServiceError(
        service.record({ action })
      );
    });
  }
});

test('record rejects an action longer than 160 characters', async () => {
  const { service } = createMocks();

  await expectRejectedServiceError(
    service.record({
      action: 'a'.repeat(161),
    })
  );
});

test('record rejects an entity longer than 100 characters', async () => {
  const { service } = createMocks();

  await expectRejectedServiceError(
    service.record({
      action: 'entity.updated',
      entity: 'E'.repeat(101),
    })
  );
});

test('record rejects an entity ID longer than 128 characters', async () => {
  const { service } = createMocks();

  await expectRejectedServiceError(
    service.record({
      action: 'entity.updated',
      entityId: '1'.repeat(129),
    })
  );
});

test('record rejects an IP address longer than 64 characters', async () => {
  const { service } = createMocks();

  await expectRejectedServiceError(
    service.record({
      action: 'request.received',
      ipAddress: '1'.repeat(65),
    })
  );
});

test('record rejects non-object metadata', async (t) => {
  const { service } = createMocks();

  for (const metadata of ['metadata', 123, [], true]) {
    await t.test(`rejects ${String(metadata)}`, async () => {
      await expectRejectedServiceError(
        service.record({
          action: 'metadata.test',
          metadata,
        })
      );
    });
  }
});

test('record accepts null metadata and stores an empty object', async () => {
  const {
    service,
    createdEntries,
  } = createMocks();

  await service.record({
    action: 'metadata.test',
    metadata: null,
  });

  assert.deepEqual(createdEntries[0].metadata, {});
});

test('record redacts sensitive metadata keys', async () => {
  const {
    service,
    createdEntries,
  } = createMocks();

  await service.record({
    action: 'auth.login',
    metadata: {
      username: 'student@example.com',
      password: 'do-not-store',
      accessToken: 'secret-token',
      refreshToken: 'refresh-secret',
      authorization: 'Bearer secret',
      cookie: 'session-secret',
      apiKey: 'api-secret',
      otp: '123456',
      safe: {
        status: 'success',
        cardNumber: '4111111111111111',
        nestedSecret: 'do-not-store',
      },
    },
  });

  assert.deepEqual(createdEntries[0].metadata, {
    username: 'student@example.com',
    safe: {
      status: 'success',
    },
  });
});

test('redact removes sensitive keys case-insensitively', () => {
  assert.deepEqual(
    redact({
      Password: 'hidden',
      ACCESS_TOKEN: 'hidden',
      ApiKey: 'hidden',
      publicValue: 'visible',
    }),
    {
      publicValue: 'visible',
    }
  );
});

test('redact truncates strings to 500 characters', () => {
  const result = redact({
    message: 'x'.repeat(600),
  });

  assert.equal(result.message.length, 500);
});

test('redact limits arrays to 50 items', () => {
  const result = redact({
    values: Array.from({ length: 60 }, (_, index) => index),
  });

  assert.equal(result.values.length, 50);
  assert.equal(result.values[49], 49);
});

test('redact limits object entries to 50 items', () => {
  const input = {};

  for (let index = 0; index < 60; index += 1) {
    input[`field${index}`] = index;
  }

  const result = redact(input);

  assert.equal(Object.keys(result).length, 50);
  assert.equal(result.field49, 49);
  assert.equal(Object.hasOwn(result, 'field50'), false);
});

test('redact truncates metadata keys to 100 characters', () => {
  const key = 'k'.repeat(120);
  const result = redact({ [key]: 'value' });

  assert.equal(Object.keys(result)[0].length, 100);
});

test('redact replaces circular references with a marker', () => {
  const metadata = {
    event: 'circular',
  };

  metadata.self = metadata;

  assert.deepEqual(redact(metadata), {
    event: 'circular',
    self: '[CIRCULAR_REFERENCE]',
  });
});

test('redact replaces non-finite numbers with null', () => {
  assert.deepEqual(
    redact({
      positiveInfinity: Infinity,
      negativeInfinity: -Infinity,
      notANumber: NaN,
      finite: 10,
    }),
    {
      positiveInfinity: null,
      negativeInfinity: null,
      notANumber: null,
      finite: 10,
    }
  );
});

test('redact omits unsupported value types', () => {
  const result = redact({
    supported: 'yes',
    unsupported: () => 'secret',
  });

  assert.deepEqual(result, {
    supported: 'yes',
  });
});

test('record rejects metadata exceeding the serialized size limit', async () => {
  const { service } = createMocks();
  const metadata = {};

  for (let index = 0; index < 50; index += 1) {
    metadata[`field${index}`] = 'x'.repeat(500);
  }

  await expectRejectedServiceError(
    service.record({
      action: 'metadata.too-large',
      metadata,
    })
  );
});

test('record rejects a clock that returns a non-Date value', async () => {
  const { service } = createMocks({
    clock: () => '2026-10-16',
  });

  await assert.rejects(
    service.record({ action: 'clock.test' }),
    /Audit clock must return a valid Date/
  );
});

test('record rejects an invalid Date from the clock', async () => {
  const { service } = createMocks({
    clock: () => new Date('invalid'),
  });

  await assert.rejects(
    service.record({ action: 'clock.test' }),
    /Audit clock must return a valid Date/
  );
});

test('record clones the Date returned by the clock', async () => {
  const clockDate = new Date(FIXED_DATE);
  const { service, createdEntries } = createMocks({
    clock: () => clockDate,
  });

  await service.record({
    action: 'clock.clone',
  });

  assert.notEqual(createdEntries[0].createdAt, clockDate);
  assert.equal(
    createdEntries[0].createdAt.toISOString(),
    clockDate.toISOString()
  );
});

test('record propagates repository create errors', async () => {
  const repositoryError = new Error('Database unavailable');
  const { service, createdEntries } = createMocks({
    createError: repositoryError,
  });

  await assert.rejects(
    service.record({
      action: 'database.failure',
    }),
    (error) => error === repositoryError
  );

  assert.equal(createdEntries.length, 0);
});

test('log delegates to record', async () => {
  const { service, createdEntries } = createMocks();

  await service.log({
    action: 'compatibility.log',
    metadata: {
      source: 'test',
    },
  });

  assert.equal(createdEntries.length, 1);
  assert.equal(
    createdEntries[0].action,
    'compatibility.log'
  );
});

test('list defaults to a limit of 50', async () => {
  const {
    service,
    listedQueries,
  } = createMocks();

  await service.list();

  assert.deepEqual(listedQueries[0], {
    limit: 50,
    cursor: undefined,
  });
});

test('list rejects null, primitive, and array queries', async (t) => {
  const { service } = createMocks();

  for (const query of [null, 'query', 123, []]) {
    await t.test(`rejects ${String(query)}`, async () => {
      await expectRejectedServiceError(
        service.list(query)
      );
    });
  }
});

test('list normalizes filters and dates', async () => {
  const {
    service,
    listedQueries,
  } = createMocks();

  const result = await service.list({
    limit: '25',
    cursor: 'cursor-123',
    actorId: 42,
    entity: 'Application',
    action: 'application.submitted',
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-16T23:59:59.000Z',
  });

  assert.deepEqual(listedQueries[0], {
    limit: 25,
    cursor: 'cursor-123',
    actorId: '42',
    entity: 'Application',
    action: 'application.submitted',
    from: new Date('2026-10-01T00:00:00.000Z'),
    to: new Date('2026-10-16T23:59:59.000Z'),
  });

  assert.deepEqual(result, {
    items: [],
    nextCursor: null,
  });
});

test('list caps the requested limit at 100', async () => {
  const {
    service,
    listedQueries,
  } = createMocks();

  await service.list({
    limit: 500,
  });

  assert.equal(listedQueries[0].limit, 100);
});

test('list accepts an omitted limit and uses its default', async () => {
  const {
    service,
    listedQueries,
  } = createMocks();

  await service.list({
    entity: 'Application',
  });

  assert.equal(listedQueries[0].limit, 50);
});

test('list rejects zero, negative, fractional, and unsafe limits', async (t) => {
  const { service } = createMocks();

  for (const limit of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await t.test(`rejects limit ${limit}`, async () => {
      await expectRejectedServiceError(
        service.list({ limit })
      );
    });
  }
});

test('list rejects invalid from and to dates', async (t) => {
  const { service } = createMocks();

  for (const query of [
    { from: 'not-a-date' },
    { to: 'not-a-date' },
  ]) {
    await t.test(JSON.stringify(query), async () => {
      await expectRejectedServiceError(
        service.list(query)
      );
    });
  }
});

test('list rejects a from date later than the to date', async () => {
  const { service } = createMocks();

  await expectRejectedServiceError(
    service.list({
      from: '2026-10-17T00:00:00.000Z',
      to: '2026-10-16T00:00:00.000Z',
    })
  );
});

test('list accepts equal from and to dates', async () => {
  const {
    service,
    listedQueries,
  } = createMocks();

  await service.list({
    from: '2026-10-16T00:00:00.000Z',
    to: '2026-10-16T00:00:00.000Z',
  });

  assert.equal(
    listedQueries[0].from.toISOString(),
    listedQueries[0].to.toISOString()
  );
});

test('list rejects an oversized cursor', async () => {
  const { service } = createMocks();

  await expectRejectedServiceError(
    service.list({
      cursor: 'c'.repeat(513),
    })
  );
});

test('list validates entity and action filters', async () => {
  const { service } = createMocks();

  await expectRejectedServiceError(
    service.list({
      entity: 'e'.repeat(101),
    })
  );

  await expectRejectedServiceError(
    service.list({
      action: 'a'.repeat(161),
    })
  );
});

test('list propagates repository list errors', async () => {
  const repositoryError = new Error('Audit query failed');
  const { service } = createMocks({
    listError: repositoryError,
  });

  await assert.rejects(
    service.list(),
    (error) => error === repositoryError
  );
});

test('list throws when the repository does not implement list', async () => {
  const service = createAuditService({
    auditRepository: {
      create: async (entry) => entry,
    },
  });

  await assert.rejects(
    service.list(),
    /auditRepository must implement list/
  );
});

test('list omits empty optional filters', async () => {
  const {
    service,
    listedQueries,
  } = createMocks();

  await service.list({
    actorId: '',
    entity: '',
    action: '',
    cursor: null,
    from: '',
    to: '',
  });

  assert.deepEqual(listedQueries[0], {
    limit: 50,
    cursor: undefined,
  });
});


'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPaymentService,
} = require('../../../src/services/payment.service');

const WEBHOOK_SECRET = 'test-webhook-secret';
const RAW_BODY = Buffer.from(
  '{"id":"evt-101","type":"payment.succeeded","paymentId":"pi-101"}'
);

function makePayment(overrides = {}) {
  return {
    id: 'PAY-101',
    userId: 'USER-101',
    amount: 250000,
    currency: 'INR',
    status: 'pending',
    description: 'Course fee payment',
    metadata: { applicationId: 'APP-101' },
    providerIntentId: 'pi-101',
    ...overrides,
  };
}

function createMocks(options = {}) {
  const payments = options.payments || [makePayment()];
  const calls = {
    create: [],
    updateById: [],
    findById: [],
    createIntent: [],
    updateByProviderIntentId: [],
    hasProcessedEvent: [],
    markEventProcessed: [],
    parseWebhook: [],
    verifySignature: [],
    audit: [],
  };

  const processedEventIds = new Set(
    options.processedEventIds || []
  );

  const paymentRepository = {
    async create(input) {
      calls.create.push(input);

      if (options.createError) {
        throw options.createError;
      }

      if (options.createResult !== undefined) {
        return options.createResult;
      }

      const payment = {
        id: `PAY-${payments.length + 1}`,
        ...input,
      };

      payments.push(payment);
      return payment;
    },

    async updateById(id, changes) {
      calls.updateById.push({ id, changes });

      if (options.updateByIdError) {
        throw options.updateByIdError;
      }

      if (options.updateByIdResult !== undefined) {
        return options.updateByIdResult;
      }

      const payment = payments.find(
        (item) => String(item.id) === String(id)
      );

      if (!payment) return null;

      Object.assign(payment, changes);
      return payment;
    },

    async findById(id) {
      calls.findById.push(id);

      if (options.findByIdError) {
        throw options.findByIdError;
      }

      if (options.findByIdResult !== undefined) {
        return options.findByIdResult;
      }

      return payments.find(
        (item) => String(item.id) === String(id)
      ) || null;
    },

    async updateByProviderIntentId(providerIntentId, changes) {
      calls.updateByProviderIntentId.push({
        providerIntentId,
        changes,
      });

      if (options.updateByProviderIntentIdError) {
        throw options.updateByProviderIntentIdError;
      }

      if (options.updateByProviderIntentIdResult !== undefined) {
        return options.updateByProviderIntentIdResult;
      }

      const payment = payments.find(
        (item) =>
          item.providerIntentId === providerIntentId
      );

      if (!payment) return null;

      Object.assign(payment, changes);
      return payment;
    },

    async hasProcessedEvent(eventId) {
      calls.hasProcessedEvent.push(eventId);

      if (options.hasProcessedEventError) {
        throw options.hasProcessedEventError;
      }

      if (options.hasProcessedEventResult !== undefined) {
        return options.hasProcessedEventResult;
      }

      return processedEventIds.has(eventId);
    },

    async markEventProcessed(input) {
      calls.markEventProcessed.push(input);

      if (options.markEventProcessedError) {
        throw options.markEventProcessedError;
      }

      processedEventIds.add(input.eventId);
    },
  };

  const paymentProvider = {
    async createIntent(input) {
      calls.createIntent.push(input);

      if (options.createIntentError) {
        throw options.createIntentError;
      }

      if (options.createIntentResult !== undefined) {
        return options.createIntentResult;
      }

      return {
        id: 'pi-created-101',
        clientSecret: 'client-secret-test',
      };
    },

    async parseWebhook(input) {
      calls.parseWebhook.push(input);

      if (options.parseWebhookError) {
        throw options.parseWebhookError;
      }

      if (options.event !== undefined) {
        return options.event;
      }

      return {
        id: 'evt-101',
        type: 'payment.succeeded',
        paymentId: 'pi-101',
      };
    },
  };

  const auditService = {
    async record(event) {
      if (options.auditError) {
        throw options.auditError;
      }

      calls.audit.push(event);
    },
  };

  const verifyWebhookSignature = async (input) => {
    calls.verifySignature.push(input);

    if (options.verifySignatureError) {
      throw options.verifySignatureError;
    }

    return options.signatureValid !== false;
  };

  const service = createPaymentService({
    paymentRepository,
    paymentProvider,
    auditService: options.omitAuditService
      ? undefined
      : auditService,
    webhookSecret: options.omitWebhookSecret
      ? undefined
      : WEBHOOK_SECRET,
    verifyWebhookSignature: options.omitSignatureVerifier
      ? undefined
      : verifyWebhookSignature,
  });

  return {
    service,
    payments,
    paymentRepository,
    paymentProvider,
    auditService,
    calls,
    processedEventIds,
  };
}

function ownerActor(id = 'USER-101') {
  return {
    id,
    isAdmin: false,
  };
}

function adminActor() {
  return {
    id: 'ADMIN-101',
    isAdmin: true,
  };
}

async function expectServiceError(
  promise,
  code,
  status
) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code);

    if (status !== undefined) {
      assert.equal(error.status, status);
    }

    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* Construction                                                               */
/* -------------------------------------------------------------------------- */

test('createPaymentService requires paymentRepository', () => {
  assert.throws(
    () => createPaymentService({
      paymentProvider: {},
    }),
    TypeError
  );
});

test('createPaymentService requires paymentProvider', () => {
  assert.throws(
    () => createPaymentService({
      paymentRepository: {},
    }),
    TypeError
  );
});

/* -------------------------------------------------------------------------- */
/* createIntent                                                               */
/* -------------------------------------------------------------------------- */

test('createIntent creates a payment and initializes the provider intent', async () => {
  const { service, calls } = createMocks();

  const result = await service.createIntent({
    userId: 'USER-201',
    amount: 125000,
    currency: 'inr',
    description: 'MBBS counselling fee',
    metadata: {
      applicationId: 'APP-201',
    },
  });

  assert.equal(result.paymentId, 'PAY-2');
  assert.equal(result.status, 'pending');
  assert.equal(result.clientSecret, 'client-secret-test');
  assert.equal(result.providerIntentId, 'pi-created-101');

  assert.deepEqual(calls.create[0], {
    userId: 'USER-201',
    amount: 125000,
    currency: 'INR',
    status: 'pending',
    description: 'MBBS counselling fee',
    metadata: {
      applicationId: 'APP-201',
    },
  });

  assert.deepEqual(calls.createIntent[0], {
    amount: 125000,
    currency: 'INR',
    reference: 'PAY-2',
    description: 'MBBS counselling fee',
    metadata: {
      applicationId: 'APP-201',
    },
  });

  assert.deepEqual(calls.updateById[0], {
    id: 'PAY-2',
    changes: {
      providerIntentId: 'pi-created-101',
    },
  });

  assert.equal(calls.audit.length, 1);
  assert.equal(
    calls.audit[0].action,
    'payment.intent_created'
  );
  assert.equal(calls.audit[0].entityId, 'PAY-2');
  assert.equal(calls.audit[0].actorId, 'USER-201');
  assert.deepEqual(calls.audit[0].metadata, {
    currency: 'INR',
    amount: 125000,
  });
});

test('createIntent defaults currency to INR and metadata to an empty object', async () => {
  const { service, calls } = createMocks();

  await service.createIntent({
    userId: 'USER-201',
    amount: 100,
  });

  assert.equal(calls.create[0].currency, 'INR');
  assert.deepEqual(calls.create[0].metadata, {});
});

test('createIntent accepts a provider response without a client secret', async () => {
  const { service } = createMocks({
    createIntentResult: {
      id: 'pi-no-secret',
    },
  });

  const result = await service.createIntent({
    userId: 'USER-201',
    amount: 100,
  });

  assert.equal(result.providerIntentId, 'pi-no-secret');
  assert.equal(result.clientSecret, null);
});

test('createIntent uses the updated payment status when available', async () => {
  const { service } = createMocks({
    updateByIdResult: makePayment({
      id: 'PAY-2',
      status: 'pending',
      providerIntentId: 'pi-created-101',
    }),
  });

  const result = await service.createIntent({
    userId: 'USER-201',
    amount: 100,
  });

  assert.equal(result.status, 'pending');
});

test('createIntent rejects a missing user ID', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.createIntent({
      amount: 100,
    }),
    'VALIDATION_ERROR',
    422
  );
});

test('createIntent rejects blank user IDs', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.createIntent({
      userId: ' ',
      amount: 100,
    }),
    'VALIDATION_ERROR',
    422
  );
});

test('createIntent rejects non-positive or non-integer amounts', async (t) => {
  const { service } = createMocks();

  for (const amount of [
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    '100',
    null,
  ]) {
    await t.test(`amount=${String(amount)}`, async () => {
      await expectServiceError(
        service.createIntent({
          userId: 'USER-201',
          amount,
        }),
        'VALIDATION_ERROR',
        422
      );
    });
  }
});

test('createIntent rejects invalid currency codes', async (t) => {
  const { service } = createMocks();

  for (const currency of [
    '',
    'IN',
    'INRR',
    '123',
    'US$',
    '   ',
  ]) {
    await t.test(`currency=${JSON.stringify(currency)}`, async () => {
      await expectServiceError(
        service.createIntent({
          userId: 'USER-201',
          amount: 100,
          currency,
        }),
        'VALIDATION_ERROR',
        422
      );
    });
  }
});

test('createIntent accepts valid three-letter currency codes', async () => {
  const { service, calls } = createMocks();

  await service.createIntent({
    userId: 'USER-201',
    amount: 100,
    currency: 'usd',
  });

  assert.equal(calls.create[0].currency, 'USD');
});

test('createIntent rejects non-string descriptions', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.createIntent({
      userId: 'USER-201',
      amount: 100,
      description: 123,
    }),
    'VALIDATION_ERROR',
    422
  );
});

test('createIntent accepts a null description', async () => {
  const { service, calls } = createMocks();

  await service.createIntent({
    userId: 'USER-201',
    amount: 100,
    description: null,
  });

  assert.equal(calls.create[0].description, null);
});

test('createIntent rejects non-object metadata', async (t) => {
  const { service } = createMocks();

  for (const metadata of [
    'metadata',
    123,
    [],
    true,
  ]) {
    await t.test(`metadata=${String(metadata)}`, async () => {
      await expectServiceError(
        service.createIntent({
          userId: 'USER-201',
          amount: 100,
          metadata,
        }),
        'VALIDATION_ERROR',
        422
      );
    });
  }
});

test('createIntent rejects when repository creation fails', async () => {
  const error = new Error('Database unavailable');
  const { service, calls } = createMocks({
    createError: error,
  });

  await assert.rejects(
    service.createIntent({
      userId: 'USER-201',
      amount: 100,
    }),
    (caught) => caught === error
  );

  assert.equal(calls.createIntent.length, 0);
});

test('createIntent rejects a null payment returned by the repository', async () => {
  const { service, calls } = createMocks({
    createResult: null,
  });

  await expectServiceError(
    service.createIntent({
      userId: 'USER-201',
      amount: 100,
    }),
    'NOT_FOUND',
    404
  );

  assert.equal(calls.createIntent.length, 0);
});

test('createIntent maps provider failures to PAYMENT_INITIALIZATION_FAILED', async () => {
  const { service, calls } = createMocks({
    createIntentError: new Error('Gateway unavailable'),
  });

  await expectServiceError(
    service.createIntent({
      userId: 'USER-201',
      amount: 100,
    }),
    'PAYMENT_INITIALIZATION_FAILED',
    502
  );

  // The local record is preserved for reconciliation.
  assert.equal(calls.create.length, 1);
  assert.equal(calls.updateById.length, 0);
});

test('createIntent rejects malformed provider intent responses', async () => {
  const { service, calls } = createMocks({
    createIntentResult: {
      clientSecret: 'secret-without-an-id',
    },
  });

  await expectServiceError(
    service.createIntent({
      userId: 'USER-201',
      amount: 100,
    }),
    'PAYMENT_PROVIDER_ERROR',
    502
  );

  assert.equal(calls.updateById.length, 0);
});

test('createIntent rejects an empty provider intent ID', async () => {
  const { service } = createMocks({
    createIntentResult: {
      id: '',
    },
  });

  await expectServiceError(
    service.createIntent({
      userId: 'USER-201',
      amount: 100,
    }),
    'PAYMENT_PROVIDER_ERROR',
    502
  );
});

test('createIntent reports missing provider configuration', async () => {
  const mocks = createMocks();

  const service = createPaymentService({
    paymentRepository: mocks.paymentRepository,
    paymentProvider: {},
  });

  await expectServiceError(
    service.createIntent({
      userId: 'USER-201',
      amount: 100,
    }),
    'PAYMENT_PROVIDER_MISCONFIGURED',
    503
  );
});

test('createIntent rejects a null result from updateById', async () => {
  const { service, calls } = createMocks({
    updateByIdResult: null,
  });

  await expectServiceError(
    service.createIntent({
      userId: 'USER-201',
      amount: 100,
    }),
    'NOT_FOUND',
    404
  );

  assert.equal(calls.audit.length, 0);
});

test('createIntent propagates repository update failures', async () => {
  const error = new Error('Payment update failed');
  const { service, calls } = createMocks({
    updateByIdError: error,
  });

  await assert.rejects(
    service.createIntent({
      userId: 'USER-201',
      amount: 100,
    }),
    (caught) => caught === error
  );

  assert.equal(calls.audit.length, 0);
});

test('createIntent tolerates audit failures', async () => {
  const { service } = createMocks({
    auditError: new Error('Audit service unavailable'),
  });

  const result = await service.createIntent({
    userId: 'USER-201',
    amount: 100,
  });

  assert.equal(result.providerIntentId, 'pi-created-101');
});

/* -------------------------------------------------------------------------- */
/* getById                                                                    */
/* -------------------------------------------------------------------------- */

test('getById returns a payment to its owner', async () => {
  const { service, payments } = createMocks();

  const result = await service.getById(
    'PAY-101',
    ownerActor()
  );

  assert.equal(result, payments[0]);
});

test('getById allows an administrator to read a payment', async () => {
  const { service, payments } = createMocks();

  const result = await service.getById(
    'PAY-101',
    adminActor()
  );

  assert.equal(result, payments[0]);
});

test('getById conceals another user payment', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.getById(
      'PAY-101',
      ownerActor('USER-OTHER')
    ),
    'NOT_FOUND',
    404
  );
});

test('getById conceals a payment when the actor is missing', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.getById('PAY-101'),
    'NOT_FOUND',
    404
  );
});

test('getById rejects an invalid ID', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.getById(' '),
    'VALIDATION_ERROR',
    422
  );
});

test('getById rejects a missing payment', async () => {
  const { service } = createMocks({
    payments: [],
  });

  await expectServiceError(
    service.getById(
      'PAY-MISSING',
      ownerActor()
    ),
    'NOT_FOUND',
    404
  );
});

test('getById propagates repository errors', async () => {
  const error = new Error('Database read failed');
  const { service } = createMocks({
    findByIdError: error,
  });

  await assert.rejects(
    service.getById(
      'PAY-101',
      ownerActor()
    ),
    (caught) => caught === error
  );
});

/* -------------------------------------------------------------------------- */
/* handleWebhook: input and signature verification                           */
/* -------------------------------------------------------------------------- */

test('handleWebhook rejects missing raw body', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.handleWebhook({
      signature: 'valid-signature',
    }),
    'INVALID_WEBHOOK',
    400
  );
});

test('handleWebhook rejects an empty raw body', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.handleWebhook({
      rawBody: Buffer.alloc(0),
      signature: 'valid-signature',
    }),
    'INVALID_WEBHOOK',
    400
  );
});

test('handleWebhook rejects a non-Buffer raw body', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.handleWebhook({
      rawBody: '{"id":"evt-101"}',
      signature: 'valid-signature',
    }),
    'INVALID_WEBHOOK',
    400
  );
});

test('handleWebhook requires configured signature verification', async () => {
  const mocks = createMocks({
    omitSignatureVerifier: true,
  });

  const service = createPaymentService({
    paymentRepository: mocks.paymentRepository,
    paymentProvider: mocks.paymentProvider,
    webhookSecret: WEBHOOK_SECRET,
  });

  await expectServiceError(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    'WEBHOOK_NOT_CONFIGURED',
    503
  );
});

test('handleWebhook requires a non-empty webhook secret', async () => {
  const mocks = createMocks();

  const service = createPaymentService({
    paymentRepository: mocks.paymentRepository,
    paymentProvider: mocks.paymentProvider,
    webhookSecret: '',
    verifyWebhookSignature: async () => true,
  });

  await expectServiceError(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    'WEBHOOK_NOT_CONFIGURED',
    503
  );
});

test('handleWebhook verifies the raw body, signature, headers and secret', async () => {
  const {
    service,
    calls,
  } = createMocks({
    event: {
      id: 'evt-ignored',
      type: 'payment.unknown',
    },
  });

  const headers = {
    'content-type': 'application/json',
    'x-provider-event': 'evt-ignored',
  };

  await service.handleWebhook({
    rawBody: RAW_BODY,
    signature: 'signature-value',
    headers,
  });

  assert.equal(calls.verifySignature.length, 1);

  assert.deepEqual(calls.verifySignature[0], {
    rawBody: RAW_BODY,
    signature: 'signature-value',
    headers,
    secret: WEBHOOK_SECRET,
  });
});

test('handleWebhook rejects invalid signatures', async () => {
  const { service, calls } = createMocks({
    signatureValid: false,
  });

  await expectServiceError(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'invalid-signature',
    }),
    'INVALID_SIGNATURE',
    400
  );

  assert.equal(calls.parseWebhook.length, 0);
});

test('handleWebhook maps verifier errors to INVALID_SIGNATURE', async () => {
  const { service, calls } = createMocks({
    verifySignatureError: new Error('Verifier failed'),
  });

  await expectServiceError(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    'INVALID_SIGNATURE',
    400
  );

  assert.equal(calls.parseWebhook.length, 0);
});

test('handleWebhook rejects a missing webhook parser', async () => {
  const mocks = createMocks();

  const service = createPaymentService({
    paymentRepository: mocks.paymentRepository,
    paymentProvider: {},
    webhookSecret: WEBHOOK_SECRET,
    verifyWebhookSignature: async () => true,
  });

  await expectServiceError(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    'WEBHOOK_NOT_CONFIGURED',
    503
  );
});

test('handleWebhook rejects malformed provider events', async (t) => {
  const invalidEvents = [
    null,
    {},
    { id: '', type: 'payment.succeeded' },
    { id: 'evt-1', type: '' },
    { id: 123, type: 'payment.succeeded' },
    { id: 'evt-1', type: 123 },
  ];

  for (const event of invalidEvents) {
    await t.test(JSON.stringify(event), async () => {
      const { service } = createMocks({ event });

      await expectServiceError(
        service.handleWebhook({
          rawBody: RAW_BODY,
          signature: 'signature',
        }),
        'INVALID_WEBHOOK',
        400
      );
    });
  }
});

test('handleWebhook propagates parser errors', async () => {
  const error = new Error('Unable to parse event');
  const { service } = createMocks({
    parseWebhookError: error,
  });

  await assert.rejects(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    (caught) => caught === error
  );
});

/* -------------------------------------------------------------------------- */
/* handleWebhook: event processing                                            */
/* -------------------------------------------------------------------------- */

test('handleWebhook marks a successful payment as captured', async () => {
  const {
    service,
    calls,
  } = createMocks({
    event: {
      id: 'evt-success',
      type: 'payment.succeeded',
      paymentId: 'pi-101',
    },
  });

  const result = await service.handleWebhook({
    rawBody: RAW_BODY,
    signature: 'signature',
  });

  assert.deepEqual(result, {
    received: true,
    duplicate: false,
  });

  assert.equal(
    calls.updateByProviderIntentId.length,
    1
  );

  const update = calls.updateByProviderIntentId[0];

  assert.equal(update.providerIntentId, 'pi-101');
  assert.equal(update.changes.status, 'captured');
  assert.equal(update.changes.providerEventId, 'evt-success');
  assert.ok(update.changes.processedAt instanceof Date);

  assert.deepEqual(calls.markEventProcessed[0].eventId, 'evt-success');

  assert.equal(
    calls.audit[0].action,
    'payment.webhook_processed'
  );
  assert.equal(calls.audit[0].entityId, 'pi-101');
  assert.deepEqual(calls.audit[0].metadata, {
    eventId: 'evt-success',
    type: 'payment.succeeded',
    status: 'captured',
  });
});

test('handleWebhook maps payment.failed to failed', async () => {
  const {
    service,
    calls,
  } = createMocks({
    event: {
      id: 'evt-failed',
      type: 'payment.failed',
      paymentId: 'pi-101',
    },
  });

  await service.handleWebhook({
    rawBody: RAW_BODY,
    signature: 'signature',
  });

  assert.equal(
    calls.updateByProviderIntentId[0].changes.status,
    'failed'
  );
});

test('handleWebhook maps payment.cancelled to cancelled', async () => {
  const {
    service,
    calls,
  } = createMocks({
    event: {
      id: 'evt-cancelled',
      type: 'payment.cancelled',
      paymentId: 'pi-101',
    },
  });

  await service.handleWebhook({
    rawBody: RAW_BODY,
    signature: 'signature',
  });

  assert.equal(
    calls.updateByProviderIntentId[0].changes.status,
    'cancelled'
  );
});

test('handleWebhook maps payment.refunded to refunded', async () => {
  const {
    service,
    calls,
  } = createMocks({
    event: {
      id: 'evt-refunded',
      type: 'payment.refunded',
      paymentId: 'pi-101',
    },
  });

  await service.handleWebhook({
    rawBody: RAW_BODY,
    signature: 'signature',
  });

  assert.equal(
    calls.updateByProviderIntentId[0].changes.status,
    'refunded'
  );
});

test('handleWebhook acknowledges an already-processed event', async () => {
  const {
    service,
    calls,
  } = createMocks({
    processedEventIds: ['evt-duplicate'],
    event: {
      id: 'evt-duplicate',
      type: 'payment.succeeded',
      paymentId: 'pi-101',
    },
  });

  const result = await service.handleWebhook({
    rawBody: RAW_BODY,
    signature: 'signature',
  });

  assert.deepEqual(result, {
    received: true,
    duplicate: true,
  });

  assert.equal(calls.updateByProviderIntentId.length, 0);
  assert.equal(calls.markEventProcessed.length, 0);
  assert.equal(calls.audit.length, 0);
});

test('handleWebhook does not mark an event processed when its payment is missing', async () => {
  const {
    service,
    calls,
  } = createMocks({
    updateByProviderIntentIdResult: null,
    event: {
      id: 'evt-missing-payment',
      type: 'payment.succeeded',
      paymentId: 'pi-missing',
    },
  });

  await expectServiceError(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    'PAYMENT_NOT_FOUND',
    404
  );

  assert.equal(calls.markEventProcessed.length, 0);
  assert.equal(calls.audit.length, 0);
});

test('handleWebhook reports missing provider-intent update capability', async () => {
  const mocks = createMocks({
    event: {
      id: 'evt-1',
      type: 'payment.succeeded',
      paymentId: 'pi-101',
    },
  });

  const paymentRepository = {
    create: mocks.paymentRepository.create,
    updateById: mocks.paymentRepository.updateById,
    findById: mocks.paymentRepository.findById,
    hasProcessedEvent: mocks.paymentRepository.hasProcessedEvent,
    markEventProcessed: mocks.paymentRepository.markEventProcessed,
  };

  const service = createPaymentService({
    paymentRepository,
    paymentProvider: mocks.paymentProvider,
    webhookSecret: WEBHOOK_SECRET,
    verifyWebhookSignature: async () => true,
  });

  await expectServiceError(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    'PAYMENT_REPOSITORY_MISCONFIGURED',
    500
  );
});

test('handleWebhook reports missing event tracking capability', async () => {
  const mocks = createMocks({
    event: {
      id: 'evt-1',
      type: 'payment.unknown',
    },
  });

  const paymentRepository = {
    create: mocks.paymentRepository.create,
    updateById: mocks.paymentRepository.updateById,
    findById: mocks.paymentRepository.findById,
    hasProcessedEvent: mocks.paymentRepository.hasProcessedEvent,
  };

  const service = createPaymentService({
    paymentRepository,
    paymentProvider: mocks.paymentProvider,
    webhookSecret: WEBHOOK_SECRET,
    verifyWebhookSignature: async () => true,
  });

  await expectServiceError(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    'PAYMENT_REPOSITORY_MISCONFIGURED',
    500
  );
});

test('handleWebhook processes an unknown event without changing payment status', async () => {
  const {
    service,
    calls,
  } = createMocks({
    event: {
      id: 'evt-unknown',
      type: 'customer.updated',
      paymentId: 'pi-101',
    },
  });

  const result = await service.handleWebhook({
    rawBody: RAW_BODY,
    signature: 'signature',
  });

  assert.deepEqual(result, {
    received: true,
    duplicate: false,
  });

  assert.equal(calls.updateByProviderIntentId.length, 0);
  assert.equal(calls.markEventProcessed.length, 1);
  assert.equal(calls.audit[0].metadata.status, undefined);
});

test('handleWebhook records events that do not contain a payment ID', async () => {
  const {
    service,
    calls,
  } = createMocks({
    event: {
      id: 'evt-no-payment',
      type: 'payment.succeeded',
    },
  });

  const result = await service.handleWebhook({
    rawBody: RAW_BODY,
    signature: 'signature',
  });

  assert.deepEqual(result, {
    received: true,
    duplicate: false,
  });

  assert.equal(calls.updateByProviderIntentId.length, 0);
  assert.equal(calls.markEventProcessed.length, 1);
});

test('handleWebhook propagates payment update errors', async () => {
  const error = new Error('Payment update failed');

  const {
    service,
    calls,
  } = createMocks({
    updateByProviderIntentIdError: error,
    event: {
      id: 'evt-update-error',
      type: 'payment.succeeded',
      paymentId: 'pi-101',
    },
  });

  await assert.rejects(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    (caught) => caught === error
  );

  assert.equal(calls.markEventProcessed.length, 0);
});

test('handleWebhook propagates event tracking errors', async () => {
  const error = new Error('Event tracking failed');

  const {
    service,
    calls,
  } = createMocks({
    markEventProcessedError: error,
    event: {
      id: 'evt-track-error',
      type: 'payment.succeeded',
      paymentId: 'pi-101',
    },
  });

  await assert.rejects(
    service.handleWebhook({
      rawBody: RAW_BODY,
      signature: 'signature',
    }),
    (caught) => caught === error
  );

  assert.equal(calls.updateByProviderIntentId.length, 1);
});

test('handleWebhook tolerates audit failures after processing', async () => {
  const {
    service,
    calls,
  } = createMocks({
    auditError: new Error('Audit unavailable'),
    event: {
      id: 'evt-audit-error',
      type: 'payment.succeeded',
      paymentId: 'pi-101',
    },
  });

  const result = await service.handleWebhook({
    rawBody: RAW_BODY,
    signature: 'signature',
  });

  assert.deepEqual(result, {
    received: true,
    duplicate: false,
  });

  assert.equal(calls.markEventProcessed.length, 1);
});

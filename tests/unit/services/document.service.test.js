
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDocumentService,
} = require('../../../src/services/document.service');

const FIXED_DOCUMENT_ID = 'DOC-101';
const FIXED_OWNER_ID = 'USER-101';

function makeDocument(overrides = {}) {
  return {
    id: FIXED_DOCUMENT_ID,
    ownerId: FIXED_OWNER_ID,
    originalName: 'identity-document.pdf',
    storageKey: 'documents/USER-101/identity-document.pdf',
    mimeType: 'application/pdf',
    size: 102400,
    status: 'pending',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    ...overrides,
  };
}

function createMocks(options = {}) {
  const documents = options.documents || [
    makeDocument(),
  ];

  const repositoryCalls = {
    findById: [],
    listForOwner: [],
    updateById: [],
    list: [],
    create: [],
    deleteById: [],
  };

  const storageCalls = {
    createDownloadUrl: [],
    remove: [],
  };

  const auditEvents = [];

  const documentRepository = {
    async findById(id) {
      repositoryCalls.findById.push(id);

      if (options.findByIdError) {
        throw options.findByIdError;
      }

      if (options.findByIdResult !== undefined) {
        return options.findByIdResult;
      }

      return documents.find(
        (document) => String(document.id) === String(id)
      ) || null;
    },

    async listForOwner(ownerId, query) {
      repositoryCalls.listForOwner.push({
        ownerId,
        query,
      });

      if (options.listForOwnerError) {
        throw options.listForOwnerError;
      }

      return options.listForOwnerResult === undefined
        ? { items: [], nextCursor: null }
        : options.listForOwnerResult;
    },

    async updateById(id, changes) {
      repositoryCalls.updateById.push({
        id,
        changes,
      });

      if (options.updateByIdError) {
        throw options.updateByIdError;
      }

      if (options.updateByIdResult !== undefined) {
        return options.updateByIdResult;
      }

      const document = documents.find(
        (item) => String(item.id) === String(id)
      );

      if (!document) return null;

      Object.assign(document, changes);
      return document;
    },

    async list(query) {
      repositoryCalls.list.push(query);

      if (options.listError) {
        throw options.listError;
      }

      return options.listResult === undefined
        ? { items: documents, total: documents.length }
        : options.listResult;
    },

    async create(input) {
      if (options.createError) {
        throw options.createError;
      }

      repositoryCalls.create.push(input);

      const document = {
        id: `DOC-${documents.length + 1}`,
        ...input,
      };

      documents.push(document);
      return document;
    },

    async deleteById(id) {
      repositoryCalls.deleteById.push(id);

      if (options.deleteByIdError) {
        throw options.deleteByIdError;
      }

      const index = documents.findIndex(
        (item) => String(item.id) === String(id)
      );

      if (index === -1) return false;

      documents.splice(index, 1);
      return true;
    },
  };

  const storageService = {
    async createDownloadUrl(input) {
      storageCalls.createDownloadUrl.push(input);

      if (options.createDownloadUrlError) {
        throw options.createDownloadUrlError;
      }

      return options.downloadUrlResult === undefined
        ? {
            url: 'https://storage.example.test/signed-document',
            expiresInSeconds: input.expiresInSeconds,
          }
        : options.downloadUrlResult;
    },

    async remove(input) {
      storageCalls.remove.push(input);

      if (options.storageRemoveError) {
        throw options.storageRemoveError;
      }

      return options.storageRemoveResult;
    },
  };

  const auditService = {
    async record(event) {
      if (options.auditError) {
        throw options.auditError;
      }

      auditEvents.push(event);
    },
  };

  const service = createDocumentService({
    documentRepository,
    storageService,
    auditService: options.omitAuditService
      ? undefined
      : auditService,
  });

  return {
    service,
    documents,
    documentRepository,
    storageService,
    auditService,
    repositoryCalls,
    storageCalls,
    auditEvents,
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

function adminActor(overrides = {}) {
  return {
    id: 'ADMIN-101',
    isAdmin: true,
    ...overrides,
  };
}

function ownerActor(overrides = {}) {
  return {
    id: FIXED_OWNER_ID,
    isAdmin: false,
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* Construction and dependencies                                              */
/* -------------------------------------------------------------------------- */

test('createDocumentService requires documentRepository', () => {
  assert.throws(
    () => createDocumentService({
      storageService: {
        createDownloadUrl() {},
      },
    }),
    TypeError
  );
});

test('createDocumentService requires storageService', () => {
  assert.throws(
    () => createDocumentService({
      documentRepository: {
        findById() {},
      },
    }),
    TypeError
  );
});

test('createDocumentService accepts optional auditService', () => {
  assert.doesNotThrow(() => createDocumentService({
    documentRepository: {
      findById() {},
    },
    storageService: {},
  }));
});

/* -------------------------------------------------------------------------- */
/* getById and access control                                                  */
/* -------------------------------------------------------------------------- */

test('getById returns a document to its owner', async () => {
  const { service, documents } = createMocks();

  const result = await service.getById(
    FIXED_DOCUMENT_ID,
    ownerActor()
  );

  assert.equal(result, documents[0]);
});

test('getById returns a document to an administrator', async () => {
  const { service, documents } = createMocks();

  const result = await service.getById(
    FIXED_DOCUMENT_ID,
    adminActor()
  );

  assert.equal(result, documents[0]);
});

test('getById conceals documents from unauthorized actors', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.getById(FIXED_DOCUMENT_ID, {
      id: 'OTHER-USER',
      isAdmin: false,
    }),
    'NOT_FOUND',
    404
  );
});

test('getById conceals documents when actor is missing', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.getById(FIXED_DOCUMENT_ID),
    'NOT_FOUND',
    404
  );
});

test('getById rejects a missing document', async () => {
  const { service } = createMocks({
    documents: [],
  });

  await expectServiceError(
    service.getById('DOC-MISSING', ownerActor()),
    'NOT_FOUND',
    404
  );
});

test('getById rejects an invalid document ID', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.getById('  ', ownerActor()),
    'VALIDATION_ERROR',
    422
  );
});

test('getById propagates repository failures', async () => {
  const error = new Error('Database unavailable');
  const { service } = createMocks({
    findByIdError: error,
  });

  await assert.rejects(
    service.getById(FIXED_DOCUMENT_ID, ownerActor()),
    (caught) => caught === error
  );
});

/* -------------------------------------------------------------------------- */
/* listForOwner                                                               */
/* -------------------------------------------------------------------------- */

test('listForOwner forwards owner ID and default query options', async () => {
  const expected = {
    items: [makeDocument()],
    nextCursor: null,
  };

  const {
    service,
    repositoryCalls,
  } = createMocks({
    listForOwnerResult: expected,
  });

  const result = await service.listForOwner(FIXED_OWNER_ID);

  assert.equal(result, expected);

  assert.deepEqual(repositoryCalls.listForOwner, [{
    ownerId: FIXED_OWNER_ID,
    query: {
      limit: 20,
      cursor: undefined,
      status: undefined,
    },
  }]);
});

test('listForOwner clamps the limit to 100', async () => {
  const {
    service,
    repositoryCalls,
  } = createMocks();

  await service.listForOwner(FIXED_OWNER_ID, {
    limit: 500,
  });

  assert.equal(
    repositoryCalls.listForOwner[0].query.limit,
    100
  );
});

test('listForOwner floors a positive fractional limit', async () => {
  const {
    service,
    repositoryCalls,
  } = createMocks();

  await service.listForOwner(FIXED_OWNER_ID, {
    limit: 12.9,
  });

  assert.equal(
    repositoryCalls.listForOwner[0].query.limit,
    12
  );
});

test('listForOwner uses the default limit for invalid values', async (t) => {
  const values = [
    undefined,
    null,
    '',
    'invalid',
    0,
    -1,
    Infinity,
    NaN,
  ];

  for (const value of values) {
    await t.test(`limit=${String(value)}`, async () => {
      const {
        service,
        repositoryCalls,
      } = createMocks();

      await service.listForOwner(FIXED_OWNER_ID, {
        limit: value,
      });

      assert.equal(
        repositoryCalls.listForOwner[0].query.limit,
        20
      );
    });
  }
});

test('listForOwner forwards a valid cursor', async () => {
  const {
    service,
    repositoryCalls,
  } = createMocks();

  await service.listForOwner(FIXED_OWNER_ID, {
    cursor: 'cursor-abc',
  });

  assert.equal(
    repositoryCalls.listForOwner[0].query.cursor,
    'cursor-abc'
  );
});

test('listForOwner omits a cursor longer than 512 characters', async () => {
  const {
    service,
    repositoryCalls,
  } = createMocks();

  await service.listForOwner(FIXED_OWNER_ID, {
    cursor: 'c'.repeat(513),
  });

  assert.equal(
    repositoryCalls.listForOwner[0].query.cursor,
    undefined
  );
});

test('listForOwner omits non-string cursors', async () => {
  const {
    service,
    repositoryCalls,
  } = createMocks();

  await service.listForOwner(FIXED_OWNER_ID, {
    cursor: 123,
  });

  assert.equal(
    repositoryCalls.listForOwner[0].query.cursor,
    undefined
  );
});

test('listForOwner forwards an allowed status filter', async () => {
  const {
    service,
    repositoryCalls,
  } = createMocks();

  await service.listForOwner(FIXED_OWNER_ID, {
    status: 'approved',
  });

  assert.equal(
    repositoryCalls.listForOwner[0].query.status,
    'approved'
  );
});

test('listForOwner omits an unsupported status filter', async () => {
  const {
    service,
    repositoryCalls,
  } = createMocks();

  await service.listForOwner(FIXED_OWNER_ID, {
    status: 'unexpected-status',
  });

  assert.equal(
    repositoryCalls.listForOwner[0].query.status,
    undefined
  );
});

test('listForOwner accepts all allowed statuses', async (t) => {
  for (const status of [
    'pending',
    'under_review',
    'approved',
    'rejected',
    'deleted',
  ]) {
    await t.test(status, async () => {
      const {
        service,
        repositoryCalls,
      } = createMocks();

      await service.listForOwner(FIXED_OWNER_ID, {
        status,
      });

      assert.equal(
        repositoryCalls.listForOwner[0].query.status,
        status
      );
    });
  }
});

test('listForOwner rejects an invalid owner ID', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.listForOwner('  '),
    'VALIDATION_ERROR',
    422
  );
});

test('listForOwner reports a missing repository capability', async () => {
  const { service } = createMocks();

  service.listForOwner;

  const misconfiguredService = createDocumentService({
    documentRepository: {
      findById() {},
    },
    storageService: {},
  });

  await expectServiceError(
    misconfiguredService.listForOwner(FIXED_OWNER_ID),
    'DOCUMENT_REPOSITORY_MISCONFIGURED',
    501
  );
});

test('listForOwner propagates repository failures', async () => {
  const error = new Error('Listing failed');
  const { service } = createMocks({
    listForOwnerError: error,
  });

  await assert.rejects(
    service.listForOwner(FIXED_OWNER_ID),
    (caught) => caught === error
  );
});

/* -------------------------------------------------------------------------- */
/* setStatus                                                                  */
/* -------------------------------------------------------------------------- */

test('setStatus allows an owner to set under_review', async () => {
  const {
    service,
    documents,
    repositoryCalls,
    auditEvents,
  } = createMocks();

  const result = await service.setStatus(
    FIXED_DOCUMENT_ID,
    'under_review',
    ownerActor()
  );

  assert.equal(result, documents[0]);
  assert.equal(result.status, 'under_review');

  assert.equal(repositoryCalls.updateById.length, 1);

  assert.equal(
    repositoryCalls.updateById[0].changes.status,
    'under_review'
  );

  assert.ok(
    repositoryCalls.updateById[0].changes.updatedAt instanceof Date
  );

  assert.equal(
    auditEvents[0].action,
    'document.status_changed'
  );

  assert.deepEqual(auditEvents[0].metadata, {
    status: 'under_review',
  });
});

test('setStatus allows an administrator to update status', async () => {
  const { service, documents } = createMocks();

  const result = await service.setStatus(
    FIXED_DOCUMENT_ID,
    'pending',
    adminActor()
  );

  assert.equal(result.status, 'pending');
  assert.equal(result, documents[0]);
});

test('setStatus requires an administrator to approve a document', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.setStatus(
      FIXED_DOCUMENT_ID,
      'approved',
      ownerActor()
    ),
    'FORBIDDEN',
    403
  );
});

test('setStatus requires an administrator to reject a document', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.setStatus(
      FIXED_DOCUMENT_ID,
      'rejected',
      ownerActor()
    ),
    'FORBIDDEN',
    403
  );
});

test('setStatus records reviewer information for approval', async () => {
  const {
    service,
    repositoryCalls,
    auditEvents,
  } = createMocks();

  const actor = adminActor();

  await service.setStatus(
    FIXED_DOCUMENT_ID,
    'approved',
    actor
  );

  const changes = repositoryCalls.updateById[0].changes;

  assert.equal(changes.status, 'approved');
  assert.equal(changes.reviewedBy, actor.id);
  assert.ok(changes.reviewedAt instanceof Date);
  assert.ok(changes.updatedAt instanceof Date);

  assert.equal(
    auditEvents[0].action,
    'document.status_changed'
  );
  assert.equal(auditEvents[0].actorId, actor.id);
});

test('setStatus records reviewer information for rejection', async () => {
  const {
    service,
    repositoryCalls,
  } = createMocks();

  await service.setStatus(
    FIXED_DOCUMENT_ID,
    'rejected',
    adminActor()
  );

  const changes = repositoryCalls.updateById[0].changes;

  assert.equal(changes.status, 'rejected');
  assert.equal(changes.reviewedBy, 'ADMIN-101');
  assert.ok(changes.reviewedAt instanceof Date);
});

test('setStatus rejects unsupported statuses', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.setStatus(
      FIXED_DOCUMENT_ID,
      'published',
      adminActor()
    ),
    'VALIDATION_ERROR',
    422
  );
});

test('setStatus rejects missing IDs', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.setStatus(
      '',
      'pending',
      adminActor()
    ),
    'VALIDATION_ERROR',
    422
  );
});

test('setStatus rejects a missing document', async () => {
  const { service } = createMocks({
    documents: [],
  });

  await expectServiceError(
    service.setStatus(
      'DOC-MISSING',
      'pending',
      adminActor()
    ),
    'NOT_FOUND',
    404
  );
});

test('setStatus conceals documents from unauthorized users', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.setStatus(
      FIXED_DOCUMENT_ID,
      'pending',
      { id: 'OTHER-USER' }
    ),
    'NOT_FOUND',
    404
  );
});

test('setStatus does not allow restoring a deleted document', async () => {
  const { service } = createMocks({
    documents: [
      makeDocument({
        status: 'deleted',
      }),
    ],
  });

  await expectServiceError(
    service.setStatus(
      FIXED_DOCUMENT_ID,
      'pending',
      adminActor()
    ),
    'INVALID_STATUS_TRANSITION',
    409
  );
});

test('setStatus allows a deleted document to remain deleted', async () => {
  const { service, documents } = createMocks({
    documents: [
      makeDocument({
        status: 'deleted',
      }),
    ],
  });

  const result = await service.setStatus(
    FIXED_DOCUMENT_ID,
    'deleted',
    adminActor()
  );

  assert.equal(result.status, 'deleted');
  assert.equal(result, documents[0]);
});

test('setStatus propagates repository lookup errors', async () => {
  const error = new Error('Lookup failed');
  const { service } = createMocks({
    findByIdError: error,
  });

  await assert.rejects(
    service.setStatus(
      FIXED_DOCUMENT_ID,
      'pending',
      adminActor()
    ),
    (caught) => caught === error
  );
});

test('setStatus propagates repository update errors', async () => {
  const error = new Error('Update failed');
  const { service, auditEvents } = createMocks({
    updateByIdError: error,
  });

  await assert.rejects(
    service.setStatus(
      FIXED_DOCUMENT_ID,
      'pending',
      adminActor()
    ),
    (caught) => caught === error
  );

  assert.equal(auditEvents.length, 0);
});

test('setStatus rejects a null update result', async () => {
  const { service, auditEvents } = createMocks({
    updateByIdResult: null,
  });

  await expectServiceError(
    service.setStatus(
      FIXED_DOCUMENT_ID,
      'pending',
      adminActor()
    ),
    'NOT_FOUND',
    404
  );

  assert.equal(auditEvents.length, 0);
});

test('setStatus tolerates audit failures', async () => {
  const { service, documents } = createMocks({
    auditError: new Error('Audit service unavailable'),
  });

  const result = await service.setStatus(
    FIXED_DOCUMENT_ID,
    'pending',
    adminActor()
  );

  assert.equal(result, documents[0]);
  assert.equal(result.status, 'pending');
});

/* -------------------------------------------------------------------------- */
/* createDownloadUrl                                                          */
/* -------------------------------------------------------------------------- */

test('createDownloadUrl generates a URL for an approved owner document', async () => {
  const expected = {
    url: 'https://storage.example.test/signed-document',
    expiresInSeconds: 300,
  };

  const {
    service,
    storageCalls,
    auditEvents,
  } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
      }),
    ],
    downloadUrlResult: expected,
  });

  const result = await service.createDownloadUrl({
    documentId: FIXED_DOCUMENT_ID,
    actor: ownerActor(),
  });

  assert.equal(result, expected);

  assert.deepEqual(storageCalls.createDownloadUrl, [{
    storageKey: 'documents/USER-101/identity-document.pdf',
    ownerId: FIXED_OWNER_ID,
    expiresInSeconds: 300,
  }]);

  assert.equal(
    auditEvents[0].action,
    'document.download_url_created'
  );

  assert.equal(
    auditEvents[0].entityId,
    FIXED_DOCUMENT_ID
  );
});

test('createDownloadUrl allows an administrator to access an approved document', async () => {
  const {
    service,
    storageCalls,
  } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
      }),
    ],
  });

  await service.createDownloadUrl({
    documentId: FIXED_DOCUMENT_ID,
    actor: adminActor(),
  });

  assert.equal(storageCalls.createDownloadUrl.length, 1);
});

test('createDownloadUrl forwards a custom expiry', async () => {
  const {
    service,
    storageCalls,
  } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
      }),
    ],
  });

  await service.createDownloadUrl({
    documentId: FIXED_DOCUMENT_ID,
    actor: ownerActor(),
    expiresInSeconds: 600,
  });

  assert.equal(
    storageCalls.createDownloadUrl[0].expiresInSeconds,
    600
  );
});

test('createDownloadUrl rejects missing document IDs', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.createDownloadUrl({
      actor: ownerActor(),
    }),
    'VALIDATION_ERROR',
    422
  );
});

test('createDownloadUrl rejects missing documents', async () => {
  const { service } = createMocks({
    documents: [],
  });

  await expectServiceError(
    service.createDownloadUrl({
      documentId: 'DOC-MISSING',
      actor: ownerActor(),
    }),
    'NOT_FOUND',
    404
  );
});

test('createDownloadUrl conceals documents from unauthorized users', async () => {
  const { service } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
      }),
    ],
  });

  await expectServiceError(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      actor: { id: 'OTHER-USER' },
    }),
    'NOT_FOUND',
    404
  );
});

test('createDownloadUrl rejects pending documents', async () => {
  const {
    service,
    storageCalls,
  } = createMocks();

  await expectServiceError(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      actor: ownerActor(),
    }),
    'DOCUMENT_UNAVAILABLE',
    403
  );

  assert.equal(storageCalls.createDownloadUrl.length, 0);
});

test('createDownloadUrl rejects under-review documents', async () => {
  const { service } = createMocks({
    documents: [
      makeDocument({
        status: 'under_review',
      }),
    ],
  });

  await expectServiceError(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      actor: ownerActor(),
    }),
    'DOCUMENT_UNAVAILABLE',
    403
  );
});

test('createDownloadUrl rejects rejected documents', async () => {
  const { service } = createMocks({
    documents: [
      makeDocument({
        status: 'rejected',
      }),
    ],
  });

  await expectServiceError(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      actor: ownerActor(),
    }),
    'DOCUMENT_UNAVAILABLE',
    403
  );
});

test('createDownloadUrl rejects deleted documents', async () => {
  const { service } = createMocks({
    documents: [
      makeDocument({
        status: 'deleted',
      }),
    ],
  });

  await expectServiceError(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      actor: ownerActor(),
    }),
    'DOCUMENT_UNAVAILABLE',
    403
  );
});

test('createDownloadUrl rejects a mismatched supplied owner ID', async () => {
  const { service } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
      }),
    ],
  });

  await expectServiceError(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      ownerId: 'OTHER-USER',
      actor: ownerActor(),
    }),
    'NOT_FOUND',
    404
  );
});

test('createDownloadUrl allows admin when supplied owner differs', async () => {
  const {
    service,
    storageCalls,
  } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
      }),
    ],
  });

  await service.createDownloadUrl({
    documentId: FIXED_DOCUMENT_ID,
    ownerId: 'OTHER-USER',
    actor: adminActor(),
  });

  assert.equal(storageCalls.createDownloadUrl.length, 1);
});

test('createDownloadUrl reports missing storage capability', async () => {
  const mocks = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
      }),
    ],
  });

  const service = createDocumentService({
    documentRepository: mocks.documentRepository,
    storageService: {},
  });

  await expectServiceError(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      actor: ownerActor(),
    }),
    'STORAGE_NOT_CONFIGURED',
    501
  );
});

test('createDownloadUrl rejects a missing storage key', async () => {
  const {
    service,
    storageCalls,
  } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
        storageKey: '',
      }),
    ],
  });

  await expectServiceError(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      actor: ownerActor(),
    }),
    'VALIDATION_ERROR',
    422
  );

  assert.equal(storageCalls.createDownloadUrl.length, 0);
});

test('createDownloadUrl rejects storage keys longer than 1024 characters', async () => {
  const { service } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
        storageKey: 'k'.repeat(1025),
      }),
    ],
  });

  await expectServiceError(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      actor: ownerActor(),
    }),
    'VALIDATION_ERROR',
    422
  );
});

test('createDownloadUrl propagates storage errors', async () => {
  const error = new Error('Storage unavailable');

  const { service, auditEvents } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
      }),
    ],
    createDownloadUrlError: error,
  });

  await assert.rejects(
    service.createDownloadUrl({
      documentId: FIXED_DOCUMENT_ID,
      actor: ownerActor(),
    }),
    (caught) => caught === error
  );

  assert.equal(auditEvents.length, 0);
});

test('createDownloadUrl tolerates audit failures', async () => {
  const { service } = createMocks({
    documents: [
      makeDocument({
        status: 'approved',
      }),
    ],
    auditError: new Error('Audit unavailable'),
  });

  const result = await service.createDownloadUrl({
    documentId: FIXED_DOCUMENT_ID,
    actor: ownerActor(),
  });

  assert.equal(
    result.url,
    'https://storage.example.test/signed-document'
  );
});

/* -------------------------------------------------------------------------- */
/* remove                                                                      */
/* -------------------------------------------------------------------------- */

test('remove deletes storage and marks the document deleted', async () => {
  const {
    service,
    documents,
    storageCalls,
    repositoryCalls,
    auditEvents,
  } = createMocks();

  const result = await service.remove(
    FIXED_DOCUMENT_ID,
    ownerActor()
  );

  assert.equal(result.id, FIXED_DOCUMENT_ID);
  assert.equal(result.deleted, true);
  assert.equal(result.document, documents[0]);
  assert.equal(result.document.status, 'deleted');
  assert.ok(result.document.deletedAt instanceof Date);

  assert.deepEqual(storageCalls.remove, [{
    storageKey: 'documents/USER-101/identity-document.pdf',
    ownerId: FIXED_OWNER_ID,
  }]);

  assert.equal(repositoryCalls.updateById.length, 1);
  assert.equal(
    repositoryCalls.updateById[0].changes.status,
    'deleted'
  );

  assert.equal(
    auditEvents[0].action,
    'document.deleted'
  );

  assert.equal(
    auditEvents[0].entityId,
    FIXED_DOCUMENT_ID
  );
});

test('remove allows an administrator to delete a document', async () => {
  const { service, storageCalls } = createMocks();

  const result = await service.remove(
    FIXED_DOCUMENT_ID,
    adminActor()
  );

  assert.equal(result.deleted, true);
  assert.equal(storageCalls.remove.length, 1);
});

test('remove conceals documents from unauthorized users', async () => {
  const { service, storageCalls } = createMocks();

  await expectServiceError(
    service.remove(
      FIXED_DOCUMENT_ID,
      { id: 'OTHER-USER' }
    ),
    'NOT_FOUND',
    404
  );

  assert.equal(storageCalls.remove.length, 0);
});

test('remove rejects a missing document', async () => {
  const { service } = createMocks({
    documents: [],
  });

  await expectServiceError(
    service.remove(
      'DOC-MISSING',
      ownerActor()
    ),
    'NOT_FOUND',
    404
  );
});

test('remove rejects an invalid document ID', async () => {
  const { service } = createMocks();

  await expectServiceError(
    service.remove(' ', ownerActor()),
    'VALIDATION_ERROR',
    422
  );
});

test('remove is idempotent for documents already marked deleted', async () => {
  const {
    service,
    storageCalls,
    repositoryCalls,
    auditEvents,
  } = createMocks({
    documents: [
      makeDocument({
        status: 'deleted',
      }),
    ],
  });

  const result = await service.remove(
    FIXED_DOCUMENT_ID,
    ownerActor()
  );

  assert.deepEqual(result, {
    id: FIXED_DOCUMENT_ID,
    deleted: true,
  });

  assert.equal(storageCalls.remove.length, 0);
  assert.equal(repositoryCalls.updateById.length, 0);
  assert.equal(auditEvents.length, 0);
});

test('remove reports missing storage deletion capability', async () => {
  const mocks = createMocks();

  const service = createDocumentService({
    documentRepository: mocks.documentRepository,
    storageService: {},
  });

  await expectServiceError(
    service.remove(
      FIXED_DOCUMENT_ID,
      ownerActor()
    ),
    'STORAGE_NOT_CONFIGURED',
    501
  );

  assert.equal(mocks.repositoryCalls.updateById.length, 0);
});

test('remove propagates storage deletion errors', async () => {
  const error = new Error('Storage deletion failed');

  const {
    service,
    repositoryCalls,
    auditEvents,
  } = createMocks({
    storageRemoveError: error,
  });

  await assert.rejects(
    service.remove(
      FIXED_DOCUMENT_ID,
      ownerActor()
    ),
    (caught) => caught === error
  );

  assert.equal(repositoryCalls.updateById.length, 0);
  assert.equal(auditEvents.length, 0);
});

test('remove propagates repository update errors after storage removal', async () => {
  const error = new Error('Database update failed');

  const {
    service,
    storageCalls,
    auditEvents,
  } = createMocks({
    updateByIdError: error,
  });

  await assert.rejects(
    service.remove(
      FIXED_DOCUMENT_ID,
      ownerActor()
    ),
    (caught) => caught === error
  );

  assert.equal(storageCalls.remove.length, 1);
  assert.equal(auditEvents.length, 0);
});

test('remove rejects a null repository update result', async () => {
  const {
    service,
    auditEvents,
  } = createMocks({
    updateByIdResult: null,
  });

  await expectServiceError(
    service.remove(
      FIXED_DOCUMENT_ID,
      ownerActor()
    ),
    'NOT_FOUND',
    404
  );

  assert.equal(auditEvents.length, 0);
});

test('remove tolerates audit failures', async () => {
  const { service } = createMocks({
    auditError: new Error('Audit unavailable'),
  });

  const result = await service.remove(
    FIXED_DOCUMENT_ID,
    ownerActor()
  );

  assert.equal(result.deleted, true);
  assert.equal(result.document.status, 'deleted');
});

/* -------------------------------------------------------------------------- */
/* Inherited CRUD operations                                                   */
/* -------------------------------------------------------------------------- */

test('inherited list delegates to the repository', async () => {
  const expected = {
    items: [makeDocument()],
    total: 1,
  };

  const { service } = createMocks({
    listResult: expected,
  });

  const result = await service.list();

  assert.equal(result, expected);
});

test('inherited create delegates to the repository', async () => {
  const { service, repositoryCalls } = createMocks();

  const result = await service.create({
    ownerId: FIXED_OWNER_ID,
    originalName: 'transcript.pdf',
  });

  assert.equal(result.ownerId, FIXED_OWNER_ID);
  assert.equal(repositoryCalls.create.length, 1);
});

test('inherited getById uses the CRUD implementation when no actor is passed', async () => {
  const { service } = createMocks();

  const result = await service.getById(FIXED_DOCUMENT_ID);

  assert.equal(result.id, FIXED_DOCUMENT_ID);
});

test('inherited remove is overridden by the document-aware implementation', async () => {
  const {
    service,
    storageCalls,
  } = createMocks();

  await service.remove(
    FIXED_DOCUMENT_ID,
    ownerActor()
  );

  assert.equal(storageCalls.remove.length, 1);
});

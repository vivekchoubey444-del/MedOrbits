/**

* MedOrbits -- Authorization Security Tests
* File: tests/security/authorization.security.test.js
* Run:
* npx jest –runInBand tests/security/authorization.security.test.js
* Scope:
* ●	Authentication prerequisite
* ●	Role-based authorization
* ●	Permission-based authorization
* ●	Require-any and require-all permission policies
* ●	Privilege escalation resistance
* ●	Resource ownership / IDOR checks
* ●	Asynchronous ownership checks and error propagation
* These tests exercise the authorization middleware directly. Route-level
* security must additionally be tested against the application's real routes.
    */

'use strict';

const authorize = require('../../src/middleware/authorize');

function createRequest({
user,
params = {},
query = {},
body = {},
headers = {},
method = 'GET',
path = '/api/v1/resource',
} = {}) {
return {
user,
params,
query,
body,
headers,
method,
path,
get(name) {
return headers[name.toLowerCase()] || headers[name] || undefined;
},
};
}

async function invokeMiddleware(middleware, req) {
let nextCalled = false;
let nextError;

const res = {};

await middleware(req, res, (error) => {
nextCalled = true;
nextError = error;
});

return {
nextCalled,
error: nextError,
req,
res,
};
}

function createOwnershipCheck(resourceOwnerId) {
return async (req, user) => {
const requestedResourceId = req.params.id;

// In a real application, the resource owner must be loaded from a
// trusted repository using the requested resource ID.
return String(requestedResourceId) === String(resourceOwnerId.resourceId) &&
  String(user.id) === String(resourceOwnerId.ownerId);

};
}

describe('Authorization security', () => {
describe('Authentication prerequisite', () => {
test('denies requests without an authenticated user', async () => {
const middleware = authorize({ roles: ['admin'] });
const result = await invokeMiddleware(middleware, createRequest());

  expect(result.nextCalled).toBe(true);
  expect(result.error).toBeInstanceOf(Error);
  expect(result.error.status).toBe(401);
  expect(result.error.code).toBe('AUTHENTICATION_REQUIRED');
});
test('denies requests when user is explicitly undefined', async () => {
  const middleware = authorize({ permissions: ['records:read'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({ user: undefined }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(401);
  expect(result.error.code).toBe('AUTHENTICATION_REQUIRED');
});
test('allows an authenticated user when no role or permission is required', async () => {
  const middleware = authorize({});
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'], permissions: [] },
    }),
  );
  expect(result.error).toBeUndefined();
  expect(result.nextCalled).toBe(true);
});

});

describe('Role-based access control', () => {
test('allows a user with a required role', async () => {
const middleware = authorize({ roles: ['admin'] });
const result = await invokeMiddleware(
middleware,
createRequest({
user: { id: 'user-1', roles: ['admin'] },
}),
);

  expect(result.error).toBeUndefined();
  expect(result.nextCalled).toBe(true);
});
test('denies a user without a required role', async () => {
  const middleware = authorize({ roles: ['admin'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'] },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
  expect(result.error.code).toBe('FORBIDDEN');
});
test('allows access when any one of the required roles matches', async () => {
  const middleware = authorize({ roles: ['admin', 'manager'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-2', roles: ['manager'] },
    }),
  );
  expect(result.error).toBeUndefined();
});
test('supports a singular role property', async () => {
  const middleware = authorize({ roles: ['admin'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-3', role: 'admin' },
    }),
  );
  expect(result.error).toBeUndefined();
});
test('does not grant access based on a role supplied in the request body', async () => {
  const middleware = authorize({ roles: ['admin'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-4', roles: ['user'] },
      body: { role: 'admin', roles: ['admin'], isAdmin: true },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
  expect(result.error.code).toBe('FORBIDDEN');
});
test('does not grant access based on a role supplied in query parameters', async () => {
  const middleware = authorize({ roles: ['admin'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-5', roles: ['user'] },
      query: { role: 'admin', isAdmin: 'true' },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
});
test('does not grant access based on spoofed identity headers', async () => {
  const middleware = authorize({ roles: ['admin'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-6', roles: ['user'] },
      headers: {
        'x-user-role': 'admin',
        'x-user-id': 'admin-1',
        'x-authenticated-user': 'admin',
      },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
});

});

describe('Permission-based access control', () => {
test('allows a user with a required permission', async () => {
const middleware = authorize({ permissions: ['records:read'] });
const result = await invokeMiddleware(
middleware,
createRequest({
user: {
id: 'user-1',
roles: ['user'],
permissions: ['records:read'],
},
}),
);

  expect(result.error).toBeUndefined();
});
test('denies a user without the required permission', async () => {
  const middleware = authorize({ permissions: ['records:delete'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: {
        id: 'user-1',
        permissions: ['records:read'],
      },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
  expect(result.error.code).toBe('FORBIDDEN');
});
test('allows access when at least one permission matches by default', async () => {
  const middleware = authorize({
    permissions: ['records:read', 'records:write'],
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: {
        id: 'user-1',
        permissions: ['records:write'],
      },
    }),
  );
  expect(result.error).toBeUndefined();
});
test('requires every permission when requireAllPermissions is true', async () => {
  const middleware = authorize({
    permissions: ['records:read', 'records:write'],
    requireAllPermissions: true,
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: {
        id: 'user-1',
        permissions: ['records:read'],
      },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
  expect(result.error.code).toBe('FORBIDDEN');
});
test('allows access when every required permission is present', async () => {
  const middleware = authorize({
    permissions: ['records:read', 'records:write'],
    requireAllPermissions: true,
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: {
        id: 'user-1',
        permissions: ['records:read', 'records:write'],
      },
    }),
  );
  expect(result.error).toBeUndefined();
});
test('does not accept permissions supplied only in the request body', async () => {
  const middleware = authorize({ permissions: ['users:delete'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', permissions: ['users:read'] },
      body: { permissions: ['users:delete'] },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
});
test('does not accept permissions supplied only in query parameters', async () => {
  const middleware = authorize({ permissions: ['users:delete'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', permissions: ['users:read'] },
      query: { permissions: 'users:delete' },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
});

});

describe('Combined role and permission requirements', () => {
test('requires both a matching role and a matching permission', async () => {
const middleware = authorize({
roles: ['admin'],
permissions: ['users:delete'],
});

  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: {
        id: 'user-1',
        roles: ['admin'],
        permissions: ['users:read'],
      },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
});
test('allows access when both role and permission requirements are satisfied', async () => {
  const middleware = authorize({
    roles: ['admin'],
    permissions: ['users:delete'],
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: {
        id: 'user-1',
        roles: ['admin'],
        permissions: ['users:delete'],
      },
    }),
  );
  expect(result.error).toBeUndefined();
});

});

describe('Resource ownership and IDOR protection', () => {
test('allows access when the ownership callback confirms ownership', async () => {
const middleware = authorize({
ownership: createOwnershipCheck({
resourceId: 'record-1',
ownerId: 'user-1',
}),
});

  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'] },
      params: { id: 'record-1' },
    }),
  );
  expect(result.error).toBeUndefined();
});
test('denies access when a user requests another users resource', async () => {
  const middleware = authorize({
    ownership: createOwnershipCheck({
      resourceId: 'record-1',
      ownerId: 'user-1',
    }),
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-2', roles: ['user'] },
      params: { id: 'record-1' },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
  expect(result.error.code).toBe('FORBIDDEN');
});
test('denies access when the requested resource ID differs from the owned resource', async () => {
  const middleware = authorize({
    ownership: createOwnershipCheck({
      resourceId: 'record-1',
      ownerId: 'user-1',
    }),
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'] },
      params: { id: 'record-2' },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
});
test('denies access when the ownership callback returns false', async () => {
  const middleware = authorize({
    ownership: async () => false,
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'] },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
});
test('awaits asynchronous ownership checks', async () => {
  const middleware = authorize({
    ownership: async (req, user) => {
      await Promise.resolve();
      return user.id === req.params.ownerId;
    },
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'] },
      params: { ownerId: 'user-1' },
    }),
  );
  expect(result.error).toBeUndefined();
});
test('does not run ownership checks when role authorization fails', async () => {
  const ownership = jest.fn(async () => true);
  const middleware = authorize({
    roles: ['admin'],
    ownership,
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'] },
    }),
  );
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(403);
  expect(ownership).not.toHaveBeenCalled();
});
test('propagates ownership callback errors to the error handler', async () => {
  const ownershipError = new Error('Ownership lookup failed');
  const middleware = authorize({
    ownership: async () => {
      throw ownershipError;
    },
  });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'] },
    }),
  );
  expect(result.error).toBe(ownershipError);
});
test('does not allow an ownership callback to bypass missing authentication', async () => {
  const ownership = jest.fn(async () => true);
  const middleware = authorize({ ownership });
  const result = await invokeMiddleware(middleware, createRequest());
  expect(result.error).toBeDefined();
  expect(result.error.status).toBe(401);
  expect(ownership).not.toHaveBeenCalled();
});

});

describe('Convenience authorization helpers', () => {
test('requireRole enforces the specified role', async () => {
const middleware = authorize.requireRole('admin');

  const denied = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'] },
    }),
  );
  const allowed = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-2', roles: ['admin'] },
    }),
  );
  expect(denied.error).toBeDefined();
  expect(denied.error.status).toBe(403);
  expect(allowed.error).toBeUndefined();
});
test('requirePermission enforces the specified permission', async () => {
  const middleware = authorize.requirePermission('reports:read');
  const denied = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', permissions: ['reports:write'] },
    }),
  );
  const allowed = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-2', permissions: ['reports:read'] },
    }),
  );
  expect(denied.error).toBeDefined();
  expect(denied.error.status).toBe(403);
  expect(allowed.error).toBeUndefined();
});
test('forbidden creates a standardized 403 error', () => {
  const error = authorize.forbidden();
  expect(error).toBeInstanceOf(Error);
  expect(error.status).toBe(403);
  expect(error.code).toBe('FORBIDDEN');
  expect(error.publicMessage).toBe(error.message);
});

});

describe('Denial response safety', () => {
test('uses a generic forbidden message by default', async () => {
const middleware = authorize({ roles: ['admin'] });

  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', roles: ['user'] },
    }),
  );
  expect(result.error.status).toBe(403);
  expect(result.error.message).toBe(
    'You do not have permission to perform this action.',
  );
  expect(result.error.message).not.toMatch(
    /password|passwordHash|token|secret|database|sql/i,
  );
});
test('does not expose internal details in a normal authorization denial', async () => {
  const middleware = authorize({ permissions: ['billing:refund'] });
  const result = await invokeMiddleware(
    middleware,
    createRequest({
      user: { id: 'user-1', permissions: ['billing:read'] },
    }),
  );
  expect(result.error.status).toBe(403);
  expect(result.error.code).toBe('FORBIDDEN');
  expect(result.error.message).not.toContain('user-1');
  expect(result.error.message).not.toMatch(/stack|SELECT|INSERT|UPDATE/i);
});

});
});
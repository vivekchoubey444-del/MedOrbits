
'use strict';

class ServiceError extends Error {
  constructor(
    message,
    {
      code = 'SERVICE_ERROR',
      status = 400,
      details,
    } = {},
  ) {
    super(message);

    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.publicMessage = message;

    if (details !== undefined) {
      this.details = details;
    }

    Error.captureStackTrace?.(this, ServiceError);
  }
}

function requireDependency(value, name) {
  if (value === undefined || value === null) {
    throw new TypeError(`${name} dependency is required.`);
  }

  return value;
}

function requireMethod(target, method, label = method) {
  if (!target || typeof target[method] !== 'function') {
    throw new TypeError(`Dependency must implement ${label}().`);
  }

  return target[method].bind(target);
}

function requiredString(
  value,
  field,
  { min = 1, max = 500 } = {},
) {
  if (typeof value !== 'string') {
    throw new ServiceError(`${field} is required.`, {
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min < 0 ||
    max < min
  ) {
    throw new TypeError('Invalid string validation limits.');
  }

  const result = value.trim();

  if (result.length < min || result.length > max) {
    throw new ServiceError(
      `${field} must be between ${min} and ${max} characters.`,
      {
        code: 'VALIDATION_ERROR',
        status: 422,
      },
    );
  }

  return result;
}

function requiredId(value, field = 'id') {
  const validString =
    typeof value === 'string' && value.trim().length > 0;

  const validNumber =
    typeof value === 'number' && Number.isFinite(value);

  if (!validString && !validNumber) {
    throw new ServiceError(`${field} is required.`, {
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  return value;
}

function plainObject(value, field = 'input') {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new ServiceError(`${field} must be an object.`, {
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    throw new ServiceError(`${field} must be a plain object.`, {
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  return { ...value };
}

function assertFound(value, entity = 'Record') {
  if (value === null || value === undefined) {
    throw new ServiceError(`${entity} not found.`, {
      code: 'NOT_FOUND',
      status: 404,
    });
  }

  return value;
}

function assertAllowed(value, allowed, field) {
  if (!Array.isArray(allowed) || !allowed.includes(value)) {
    throw new ServiceError(`Invalid ${field}.`, {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: { allowed },
    });
  }

  return value;
}

function safePage(query = {}) {
  const parsePositiveInteger = (value, fallback, maximum) => {
    const parsed = Number(value);

    if (
      value === undefined ||
      value === null ||
      value === '' ||
      !Number.isSafeInteger(parsed) ||
      parsed < 1
    ) {
      return fallback;
    }

    return Math.min(parsed, maximum);
  };

  const page = parsePositiveInteger(query.page, 1, 100000);
  const limit = parsePositiveInteger(query.limit, 20, 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

async function audit(auditService, event) {
  if (!auditService) {
    return;
  }

  const fn =
    auditService.record ||
    auditService.log ||
    auditService.write;

  if (typeof fn !== 'function') {
    return;
  }

  try {
    await fn.call(auditService, event);
  } catch {
    // Preserve the existing non-fatal audit behavior.
    // Production deployments should report this failure through
    // independent monitoring without logging sensitive event data.
  }
}

function createCrudService({
  repository,
  entity,
  auditService,
  allowedSort = ['createdAt', 'updatedAt'],
}) {
  requireDependency(repository, `${entity} repository`);

  if (!Array.isArray(allowedSort) || allowedSort.length === 0) {
    throw new TypeError('allowedSort must be a non-empty array.');
  }

  const listFn = repository.list || repository.findMany;
  const findFn =
    repository.findById ||
    repository.getById ||
    repository.findOne;
  const createFn = repository.create || repository.insert;
  const updateFn = repository.updateById || repository.update;
  const deleteFn =
    repository.deleteById ||
    repository.remove;

  function requireRepositoryFunction(fn, description) {
    if (typeof fn !== 'function') {
      throw new TypeError(
        `${entity} repository must implement ${description}.`,
      );
    }

    return fn;
  }

  return {
    async list(query = {}) {
      const pagination = safePage(query);

      const filters =
        query.filters &&
        typeof query.filters === 'object' &&
        !Array.isArray(query.filters)
          ? { ...query.filters }
          : {};

      const sortBy = allowedSort.includes(query.sortBy)
        ? query.sortBy
        : allowedSort.includes('createdAt')
          ? 'createdAt'
          : allowedSort[0];

      const sortOrder =
        String(query.sortOrder).toLowerCase() === 'asc'
          ? 'asc'
          : 'desc';

      const fn = requireRepositoryFunction(
        listFn,
        'list() or findMany()',
      );

      return fn.call(repository, {
        ...pagination,
        filters,
        sortBy,
        sortOrder,
      });
    },

    async getById(id) {
      requiredId(id);

      const fn = requireRepositoryFunction(
        findFn,
        'findById(), getById(), or findOne()',
      );

      return assertFound(
        await fn.call(repository, id),
        entity,
      );
    },

    async create(input, actor = {}) {
      const data = plainObject(input);

      const fn = requireRepositoryFunction(
        createFn,
        'create() or insert()',
      );

      const created = assertFound(
        await fn.call(repository, data),
        entity,
      );

      await audit(auditService, {
        action: `${entity.toLowerCase()}.created`,
        entity,
        entityId: created.id ?? created._id,
        actorId: actor.id,
        metadata: {},
      });

      return created;
    },

    async update(id, input, actor = {}) {
      requiredId(id);

      const data = plainObject(input);

      const fn = requireRepositoryFunction(
        updateFn,
        'updateById() or update()',
      );

      const updated = assertFound(
        await fn.call(repository, id, data),
        entity,
      );

      await audit(auditService, {
        action: `${entity.toLowerCase()}.updated`,
        entity,
        entityId: id,
        actorId: actor.id,
        metadata: {},
      });

      return updated;
    },

    async remove(id, actor = {}) {
      requiredId(id);

      const fn = requireRepositoryFunction(
        deleteFn,
        'deleteById() or remove()',
      );

      const result = await fn.call(repository, id);

      if (
        result === false ||
        result === null ||
        result === undefined
      ) {
        throw new ServiceError(`${entity} not found.`, {
          code: 'NOT_FOUND',
          status: 404,
        });
      }

      await audit(auditService, {
        action: `${entity.toLowerCase()}.deleted`,
        entity,
        entityId: id,
        actorId: actor.id,
        metadata: {},
      });

      return {
        id,
        deleted: true,
      };
    },
  };
}

module.exports = {
  ServiceError,
  requireDependency,
  requireMethod,
  requiredString,
  requiredId,
  plainObject,
  assertFound,
  assertAllowed,
  safePage,
  audit,
  createCrudService,
};

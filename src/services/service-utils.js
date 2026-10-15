'use strict';

class ServiceError extends Error {
  constructor(message, { code = 'SERVICE_ERROR', status = 400, details } = {}) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.publicMessage = message;
  }
}

function requireDependency(value, name) {
  if (!value) throw new TypeError(`${name} dependency is required.`);
  return value;
}

function requireMethod(target, method, label = method) {
  if (!target || typeof target[method] !== 'function') {
    throw new TypeError(`Dependency must implement ${label}().`);
  }
  return target[method].bind(target);
}

function requiredString(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== 'string') throw new ServiceError(`${field} is required.`, { code: 'VALIDATION_ERROR', status: 422 });
  const result = value.trim();
  if (result.length < min || result.length > max) throw new ServiceError(`${field} must be between ${min} and ${max} characters.`, { code: 'VALIDATION_ERROR', status: 422 });
  return result;
}

function requiredId(value, field = 'id') {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
    throw new ServiceError(`${field} is required.`, { code: 'VALIDATION_ERROR', status: 422 });
  }
  return value;
}

function plainObject(value, field = 'input') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ServiceError(`${field} must be an object.`, { code: 'VALIDATION_ERROR', status: 422 });
  }
  return { ...value };
}

function assertFound(value, entity = 'Record') {
  if (value == null) throw new ServiceError(`${entity} not found.`, { code: 'NOT_FOUND', status: 404 });
  return value;
}

function assertAllowed(value, allowed, field) {
  if (!allowed.includes(value)) throw new ServiceError(`Invalid ${field}.`, { code: 'VALIDATION_ERROR', status: 422, details: { allowed } });
  return value;
}

function safePage(query = {}) {
  const page = Math.max(1, Math.min(100000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function audit(auditService, event) {
  if (!auditService) return Promise.resolve();
  const fn = auditService.record || auditService.log || auditService.write;
  if (typeof fn !== 'function') return Promise.resolve();
  return Promise.resolve(fn.call(auditService, event)).catch(() => undefined);
}

function createCrudService({ repository, entity, auditService, allowedSort = ['createdAt', 'updatedAt'] }) {
  requireDependency(repository, `${entity} repository`);
  const listFn = repository.list || repository.findMany;
  const findFn = repository.findById || repository.getById || repository.findOne;
  const createFn = repository.create || repository.insert;
  const updateFn = repository.updateById || repository.update;
  const deleteFn = repository.deleteById || repository.remove;
  return {
    async list(query = {}) {
      const pagination = safePage(query);
      const filters = query.filters && typeof query.filters === 'object' ? query.filters : {};
      const sortBy = allowedSort.includes(query.sortBy) ? query.sortBy : 'createdAt';
      const sortOrder = String(query.sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';
      if (typeof listFn !== 'function') throw new TypeError(`${entity} repository must implement list() or findMany().`);
      return listFn.call(repository, { ...pagination, filters, sortBy, sortOrder });
    },
    async getById(id) {
      requiredId(id);
      if (typeof findFn !== 'function') throw new TypeError(`${entity} repository must implement findById() or getById().`);
      return assertFound(await findFn.call(repository, id), entity);
    },
    async create(input, actor = {}) {
      const data = plainObject(input);
      if (typeof createFn !== 'function') throw new TypeError(`${entity} repository must implement create().`);
      const created = await createFn.call(repository, data);
      await audit(auditService, { action: `${entity.toLowerCase()}.created`, entity, entityId: created && (created.id ?? created._id), actorId: actor.id, metadata: {} });
      return created;
    },
    async update(id, input, actor = {}) {
      requiredId(id);
      const data = plainObject(input);
      if (typeof updateFn !== 'function') throw new TypeError(`${entity} repository must implement updateById() or update().`);
      const updated = assertFound(await updateFn.call(repository, id, data), entity);
      await audit(auditService, { action: `${entity.toLowerCase()}.updated`, entity, entityId: id, actorId: actor.id, metadata: {} });
      return updated;
    },
    async remove(id, actor = {}) {
      requiredId(id);
      if (typeof deleteFn !== 'function') throw new TypeError(`${entity} repository must implement deleteById() or remove().`);
      const result = await deleteFn.call(repository, id);
      if (result === false || result == null) throw new ServiceError(`${entity} not found.`, { code: 'NOT_FOUND', status: 404 });
      await audit(auditService, { action: `${entity.toLowerCase()}.deleted`, entity, entityId: id, actorId: actor.id, metadata: {} });
      return { id, deleted: true };
    },
  };
}

module.exports = { ServiceError, requireDependency, requireMethod, requiredString, requiredId, plainObject, assertFound, assertAllowed, safePage, audit, createCrudService };

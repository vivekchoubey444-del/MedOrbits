
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredString,
  requiredId,
  plainObject,
} = require('./service-utils');

const REDACT = /password|passphrase|token|secret|authorization|cookie|paymentMethod|cardNumber|cvv|cvc|documentContent|documentData|privateKey|apiKey|accessKey|refreshToken|sessionToken|credential|otp|recoveryCode|bankAccount|accountNumber/i;

const MAX_DEPTH = 5;
const MAX_ITEMS = 50;
const MAX_STRING_LENGTH = 500;
const MAX_METADATA_BYTES = 16_384;

function redact(value, depth = 0, seen = new WeakSet()) {
  if (value == null) return value;

  if (typeof value === 'string') {
    return value.slice(0, MAX_STRING_LENGTH);
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return Number.isFinite(value) || typeof value === 'boolean'
      ? value
      : null;
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  if (depth >= MAX_DEPTH) {
    return '[MAX_DEPTH_REACHED]';
  }

  if (seen.has(value)) {
    return '[CIRCULAR_REFERENCE]';
  }

  seen.add(value);

  let output;

  if (Array.isArray(value)) {
    output = value
      .slice(0, MAX_ITEMS)
      .map((item) => redact(item, depth + 1, seen));
  } else {
    output = {};

    for (const [key, item] of Object.entries(value).slice(0, MAX_ITEMS)) {
      if (REDACT.test(key)) continue;

      const safeKey = key.slice(0, 100);
      const safeValue = redact(item, depth + 1, seen);

      if (safeValue !== undefined) {
        output[safeKey] = safeValue;
      }
    }
  }

  seen.delete(value);
  return output;
}

function normalizeOptionalId(value, field, max = 128) {
  if (value == null || value === '') return null;

  const result = requiredString(String(value), field, {
    max,
  });

  return result;
}

function normalizeDate(value, field) {
  if (value == null || value === '') return undefined;

  const date = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ServiceError(
      `${field} must be a valid date.`,
      {
        code: 'VALIDATION_ERROR',
        status: 422,
      }
    );
  }

  return date;
}

function normalizeLimit(value, fallback = 50) {
  const parsed = Number(value);

  if (value == null || value === '') return fallback;

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ServiceError(
      'limit must be a positive integer.',
      {
        code: 'VALIDATION_ERROR',
        status: 422,
      }
    );
  }

  return Math.min(parsed, 100);
}

function createAuditService({
  auditRepository,
  clock = () => new Date(),
}) {
  requireDependency(auditRepository, 'auditRepository');

  if (typeof auditRepository.create !== 'function') {
    throw new TypeError(
      'auditRepository must implement create().'
    );
  }

  if (typeof clock !== 'function') {
    throw new TypeError('clock must be a function.');
  }

  return {
    async record(event) {
      if (
        !event ||
        typeof event !== 'object' ||
        Array.isArray(event)
      ) {
        throw new ServiceError(
          'Audit event must be an object.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      const action = requiredString(
        event.action,
        'action',
        { max: 160 }
      );

      const entity = event.entity == null
        ? null
        : requiredString(String(event.entity), 'entity', {
            max: 100,
          });

      const entityId = normalizeOptionalId(
        event.entityId,
        'entityId'
      );

      const actorId = normalizeOptionalId(
        event.actorId,
        'actorId'
      );

      const requestId = normalizeOptionalId(
        event.requestId,
        'requestId'
      );

      const ipAddress = normalizeOptionalId(
        event.ipAddress,
        'ipAddress',
        64
      );

      const metadataInput = event.metadata == null
        ? {}
        : plainObject(event.metadata, 'metadata');

      const metadata = redact(metadataInput);

      // Bound serialized metadata size before persistence.
      let serializedMetadata;

      try {
        serializedMetadata = JSON.stringify(metadata);
      } catch {
        throw new ServiceError(
          'Audit metadata could not be serialized.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      if (
        Buffer.byteLength(serializedMetadata, 'utf8') >
        MAX_METADATA_BYTES
      ) {
        throw new ServiceError(
          'Audit metadata exceeds the allowed size.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      const createdAt = clock();

      if (
        !(createdAt instanceof Date) ||
        Number.isNaN(createdAt.getTime())
      ) {
        throw new TypeError(
          'Audit clock must return a valid Date.'
        );
      }

      const entry = {
        action,
        entity,
        entityId,
        actorId,
        requestId,
        ipAddress,
        metadata,
        createdAt: new Date(createdAt.getTime()),
      };

      return auditRepository.create(entry);
    },

    async log(event) {
      return this.record(event);
    },

    async list(query = {}) {
      if (
        !query ||
        typeof query !== 'object' ||
        Array.isArray(query)
      ) {
        throw new ServiceError(
          'Audit query must be an object.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      if (typeof auditRepository.list !== 'function') {
        throw new TypeError(
          'auditRepository must implement list().'
        );
      }

      const limit = normalizeLimit(query.limit, 50);
      const from = normalizeDate(query.from, 'from');
      const to = normalizeDate(query.to, 'to');

      if (from && to && from > to) {
        throw new ServiceError(
          'from must be earlier than or equal to to.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      const cursor = query.cursor == null
        ? undefined
        : requiredString(query.cursor, 'cursor', {
            max: 512,
          });

      const filters = {
        limit,
        cursor,
      };

      if (query.actorId != null && query.actorId !== '') {
        filters.actorId = normalizeOptionalId(
          query.actorId,
          'actorId'
        );
      }

      if (query.entity != null && query.entity !== '') {
        filters.entity = requiredString(
          query.entity,
          'entity',
          { max: 100 }
        );
      }

      if (query.action != null && query.action !== '') {
        filters.action = requiredString(
          query.action,
          'action',
          { max: 160 }
        );
      }

      if (from) filters.from = from;
      if (to) filters.to = to;

      return auditRepository.list(filters);
    },
  };
}

module.exports = {
  createAuditService,
  redact,
};

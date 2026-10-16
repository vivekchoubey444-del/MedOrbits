  
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredString,
  requiredId,
  safePage,
  plainObject,
} = require('./service-utils');

const MAX_PROPERTIES = 50;
const MAX_PROPERTY_KEY_LENGTH = 80;
const MAX_STRING_LENGTH = 500;
const MAX_PROPERTY_DEPTH = 4;
const MAX_PROPERTY_BYTES = 16_384;

const SENSITIVE_KEY_PATTERN =
  /password|passphrase|token|secret|email|phone|mobile|address|document|payment|authorization|cookie|credential|api.?key|private.?key|card|cvv|cvc|bank.?account|date.?of.?birth|dob|passport|aadhaar|otp|recovery.?code/i;

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

function sanitizeProperties(value, depth = 0) {
  if (value == null) return {};

  const input = plainObject(value, 'properties');

  if (depth >= MAX_PROPERTY_DEPTH) {
    return {};
  }

  const result = {};

  for (
    const [key, val] of
    Object.entries(input).slice(0, MAX_PROPERTIES)
  ) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;

    const safeKey = key.trim().slice(
      0,
      MAX_PROPERTY_KEY_LENGTH
    );

    if (!safeKey) continue;

    if (typeof val === 'string') {
      result[safeKey] = val.slice(0, MAX_STRING_LENGTH);
      continue;
    }

    if (
      typeof val === 'number' &&
      Number.isFinite(val)
    ) {
      result[safeKey] = val;
      continue;
    }

    if (typeof val === 'boolean' || val === null) {
      result[safeKey] = val;
      continue;
    }

    if (Array.isArray(val)) {
      result[safeKey] = val
        .slice(0, MAX_PROPERTIES)
        .map((item) => {
          if (
            item == null ||
            typeof item === 'boolean'
          ) {
            return item;
          }

          if (typeof item === 'string') {
            return item.slice(0, MAX_STRING_LENGTH);
          }

          if (
            typeof item === 'number' &&
            Number.isFinite(item)
          ) {
            return item;
          }

          if (
            typeof item === 'object' &&
            !Array.isArray(item)
          ) {
            return sanitizeProperties(item, depth + 1);
          }

          return undefined;
        })
        .filter((item) => item !== undefined);

      continue;
    }

    if (typeof val === 'object') {
      result[safeKey] = sanitizeProperties(
        val,
        depth + 1
      );
    }
  }

  return result;
}

function normalizeOptionalIdentifier(value, field) {
  if (value == null || value === '') return null;

  return requiredString(String(value), field, {
    max: 128,
  });
}

function createAnalyticsService({
  analyticsRepository,
  clock = () => new Date(),
}) {
  requireDependency(
    analyticsRepository,
    'analyticsRepository'
  );

  if (typeof analyticsRepository.create !== 'function') {
    throw new TypeError(
      'analyticsRepository must implement create().'
    );
  }

  if (typeof clock !== 'function') {
    throw new TypeError('clock must be a function.');
  }

  return {
    async track(event) {
      if (
        !event ||
        typeof event !== 'object' ||
        Array.isArray(event)
      ) {
        throw new ServiceError(
          'event must be an object.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      const name = requiredString(
        event.name,
        'event.name',
        { max: 100 }
      );

      const actorId = normalizeOptionalIdentifier(
        event.actorId,
        'actorId'
      );

      const anonymousId = normalizeOptionalIdentifier(
        event.anonymousId,
        'anonymousId'
      );

      if (actorId && anonymousId) {
        throw new ServiceError(
          'Provide actorId or anonymousId, not both.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      const occurredAt = event.occurredAt != null
        ? normalizeDate(event.occurredAt, 'occurredAt')
        : normalizeDate(clock(), 'clock result');

      const properties = sanitizeProperties(
        event.properties == null
          ? {}
          : event.properties
      );

      let serialized;

      try {
        serialized = JSON.stringify(properties);
      } catch {
        throw new ServiceError(
          'Event properties could not be serialized.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      if (
        Buffer.byteLength(serialized, 'utf8') >
        MAX_PROPERTY_BYTES
      ) {
        throw new ServiceError(
          'Event properties exceed the allowed size.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      return analyticsRepository.create({
        name,
        actorId,
        anonymousId,
        occurredAt,
        properties,
      });
    },

    async report(query = {}) {
      if (
        !query ||
        typeof query !== 'object' ||
        Array.isArray(query)
      ) {
        throw new ServiceError(
          'Report query must be an object.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          }
        );
      }

      if (typeof analyticsRepository.report !== 'function') {
        throw new TypeError(
          'analyticsRepository must implement report().'
        );
      }

      const { page, limit, offset } = safePage(query);

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

      const eventName =
        query.eventName == null || query.eventName === ''
          ? undefined
          : requiredString(
              query.eventName,
              'eventName',
              { max: 100 }
            );

      return analyticsRepository.report({
        from,
        to,
        eventName,
        page,
        limit,
        offset,
      });
    },
  };
}

module.exports = {
  createAnalyticsService,
  sanitizeProperties,
};

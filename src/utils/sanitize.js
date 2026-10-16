
'use strict';

/**
 * MedOrbits -- Sanitization Utilities
 *
 * File: src/utils/sanitize.js
 *
 * Purpose:
 * - Normalize plain text and recursively sanitize JSON-like input.
 * - Enforce configurable depth, string, array, and object-key limits.
 * - Remove dangerous object keys.
 * - Escape text for HTML text contexts.
 * - Normalize search terms.
 *
 * Important:
 * Sanitization does not replace schema validation, authorization,
 * parameterized SQL queries, output encoding, or business rules.
 */

const DANGEROUS_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_MAX_STRING_LENGTH = 10000;
const DEFAULT_MAX_ARRAY_LENGTH = 1000;
const DEFAULT_MAX_OBJECT_KEYS = 500;
const DEFAULT_SEARCH_MAX_LENGTH = 100;

function validateLimit(value, name, maximum = Number.MAX_SAFE_INTEGER) {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new RangeError(
      `${name} must be a non-negative safe integer no greater than ${maximum}.`
    );
  }

  return value;
}

function sanitizeString(value, options = {}) {
  if (typeof value !== 'string') {
    return value;
  }

  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new TypeError('Sanitization options must be an object.');
  }

  const trim = options.trim ?? true;
  const maxLength = validateLimit(
    options.maxLength ?? DEFAULT_MAX_STRING_LENGTH,
    'maxLength'
  );

  if (typeof trim !== 'boolean') {
    throw new TypeError('trim must be a boolean.');
  }

  const normalized = trim ? value.trim() : value;

  return normalized.slice(0, maxLength);
}

function sanitizeObject(input, options = {}) {
  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new TypeError('Sanitization options must be an object.');
  }

  const maxDepth = validateLimit(
    options.maxDepth ?? DEFAULT_MAX_DEPTH,
    'maxDepth'
  );

  const maxStringLength = validateLimit(
    options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH,
    'maxStringLength'
  );

  const maxArrayLength = validateLimit(
    options.maxArrayLength ?? DEFAULT_MAX_ARRAY_LENGTH,
    'maxArrayLength'
  );

  const maxObjectKeys = validateLimit(
    options.maxObjectKeys ?? DEFAULT_MAX_OBJECT_KEYS,
    'maxObjectKeys'
  );

  const trimStrings = options.trimStrings ?? true;

  if (typeof trimStrings !== 'boolean') {
    throw new TypeError('trimStrings must be a boolean.');
  }

  const activePath = new WeakSet();

  function visit(value, depth) {
    if (
      value === null ||
      typeof value === 'boolean' ||
      typeof value === 'number'
    ) {
      return value;
    }

    if (typeof value === 'string') {
      return sanitizeString(value, {
        trim: trimStrings,
        maxLength: maxStringLength,
      });
    }

    if (
      value === undefined ||
      typeof value === 'function' ||
      typeof value === 'symbol' ||
      typeof value === 'bigint'
    ) {
      return undefined;
    }

    if (typeof value !== 'object') {
      return undefined;
    }

    if (depth > maxDepth) {
      throw new RangeError(
        'Input exceeds the maximum allowed nesting depth.'
      );
    }

    if (activePath.has(value)) {
      throw new TypeError(
        'Circular input objects are not supported.'
      );
    }

    activePath.add(value);

    try {
      if (Array.isArray(value)) {
        const length = Math.min(value.length, maxArrayLength);
        const result = [];

        for (let index = 0; index < length; index += 1) {
          // Preserve array positions when values are omitted.
          if (!Object.prototype.hasOwnProperty.call(value, index)) {
            result.push(null);
            continue;
          }

          const sanitized = visit(value[index], depth + 1);

          result.push(
            sanitized === undefined ? null : sanitized
          );
        }

        return result;
      }

      const prototype = Object.getPrototypeOf(value);

      if (
        prototype !== Object.prototype &&
        prototype !== null
      ) {
        throw new TypeError(
          'Only plain objects are supported.'
        );
      }

      const keys = Object.keys(value);

      if (keys.length > maxObjectKeys) {
        throw new RangeError(
          'Input contains too many object properties.'
        );
      }

      // A null-prototype object avoids inherited property behavior.
      const result = Object.create(null);

      for (const key of keys) {
        if (DANGEROUS_KEYS.has(key)) {
          continue;
        }

        const sanitized = visit(value[key], depth + 1);

        if (sanitized !== undefined) {
          result[key] = sanitized;
        }
      }

      return result;
    } finally {
      activePath.delete(value);
    }
  }

  return visit(input, 0);
}

/**
 * Escape plain text for an HTML text-node context.
 *
 * Do not use this as a universal sanitizer for URLs, CSS, JavaScript,
 * rich HTML, or arbitrary HTML attributes.
 */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#x27;';
      default:
        return character;
    }
  });
}

/**
 * Normalize a user-provided search term.
 *
 * This does not make the value safe for SQL or regular-expression
 * construction. Use parameterized database queries.
 */
function sanitizeSearchTerm(
  value,
  maxLength = DEFAULT_SEARCH_MAX_LENGTH
) {
  validateLimit(maxLength, 'maxLength');

  if (typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFKC')
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, maxLength);
}

module.exports = Object.freeze({
  DANGEROUS_KEYS,
  sanitizeString,
  sanitizeObject,
  sanitizeSearchTerm,
  escapeHtml,
});

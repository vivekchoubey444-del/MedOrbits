'use strict';

const DANGEROUS_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_MAX_STRING_LENGTH = 10000;
const DEFAULT_MAX_ARRAY_LENGTH = 1000;
const DEFAULT_MAX_OBJECT_KEYS = 500;

function sanitizeString(value, options = {}) {
  const {
    trim = true,
    maxLength = DEFAULT_MAX_STRING_LENGTH,
  } = options;

  if (typeof value !== 'string') {
    return value;
  }

  const normalized = trim ? value.trim() : value;

  return normalized.slice(0, maxLength);
}

function sanitizeObject(input, options = {}) {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxStringLength =
    options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;
  const maxArrayLength =
    options.maxArrayLength ?? DEFAULT_MAX_ARRAY_LENGTH;
  const maxObjectKeys =
    options.maxObjectKeys ?? DEFAULT_MAX_OBJECT_KEYS;
  const trimStrings = options.trimStrings ?? true;

  const seen = new WeakSet();

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
      typeof value === 'undefined' ||
      typeof value === 'function' ||
      typeof value === 'symbol' ||
      typeof value === 'bigint'
    ) {
      return undefined;
    }

    if (depth > maxDepth) {
      throw new RangeError(
        'Input exceeds the maximum allowed nesting depth.'
      );
    }

    if (typeof value !== 'object') {
      return undefined;
    }

    if (seen.has(value)) {
      throw new TypeError(
        'Circular input objects are not supported.'
      );
    }

    seen.add(value);

    let result;

    if (Array.isArray(value)) {
      result = value
        .slice(0, maxArrayLength)
        .map((item) => visit(item, depth + 1));
    } else {
      const prototype = Object.getPrototypeOf(value);

      if (
        prototype !== Object.prototype &&
        prototype !== null
      ) {
        seen.delete(value);

        throw new TypeError(
          'Only plain objects are supported.'
        );
      }

      result = Object.create(null);

      const keys = Object.keys(value);

      if (keys.length > maxObjectKeys) {
        seen.delete(value);

        throw new RangeError(
          'Input contains too many object properties.'
        );
      }

      for (const key of keys) {
        if (DANGEROUS_KEYS.has(key)) {
          continue;
        }

        const sanitizedValue = visit(
          value[key],
          depth + 1
        );

        if (sanitizedValue !== undefined) {
          result[key] = sanitizedValue;
        }
      }
    }

    seen.delete(value);

    return result;
  }

  return visit(input, 0);
}

/*
 * Use only when inserting plain text into an HTML context.
 * Prefer framework auto-escaping or safe DOM APIs when available.
 *
 * This is not a general-purpose sanitizer for URLs, CSS, JavaScript,
 * SQL, rich HTML, or HTML attributes in every context.
 */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
    };

    return replacements[character];
  });
}

function sanitizeSearchTerm(value, maxLength = 100) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFKC')
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, maxLength);
}

module.exports = {
  DANGEROUS_KEYS,
  sanitizeString,
  sanitizeObject,
  sanitizeSearchTerm,
  escapeHtml,
};

'use strict';

/**
 * MedOrbits -- Pagination Utilities
 *
 * File: src/utils/pagination.js
 *
 * Provides:
 * - Safe page and limit parsing.
 * - Configurable default and maximum page sizes.
 * - Safe SQL offset calculation.
 * - Standard pagination metadata.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_PAGE = Number.MAX_SAFE_INTEGER;

function toPositiveInteger(value, fallback, maximum = MAX_PAGE) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  // Accept positive integer numbers and digit-only strings.
  // Reject decimals, negative numbers, booleans, and other types.
  let parsed;

  if (typeof value === 'number') {
    parsed = value;
  } else if (
    typeof value === 'string' &&
    /^\d+$/.test(value.trim())
  ) {
    parsed = Number(value.trim());
  } else {
    return fallback;
  }

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > maximum
  ) {
    return fallback;
  }

  return parsed;
}

function getPagination(query = {}, options = {}) {
  if (
    query === null ||
    typeof query !== 'object' ||
    Array.isArray(query)
  ) {
    throw new TypeError('Pagination query must be an object.');
  }

  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new TypeError('Pagination options must be an object.');
  }

  const maxLimit = toPositiveInteger(
    options.maxLimit,
    MAX_LIMIT,
    MAX_LIMIT
  );

  const defaultLimit = toPositiveInteger(
    options.defaultLimit,
    DEFAULT_LIMIT,
    maxLimit
  );

  const page = toPositiveInteger(
    query.page,
    DEFAULT_PAGE
  );

  const requestedLimit = toPositiveInteger(
    query.limit,
    defaultLimit,
    Number.MAX_SAFE_INTEGER
  );

  const limit = Math.min(requestedLimit, maxLimit);
  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    throw new RangeError(
      'Pagination offset exceeds the safe integer range.'
    );
  }

  return Object.freeze({
    page,
    limit,
    offset,
  });
}

function getPaginationMeta(totalItems, pagination = {}) {
  const total = Number(totalItems);

  if (
    !Number.isSafeInteger(total) ||
    total < 0
  ) {
    throw new TypeError(
      'totalItems must be a non-negative safe integer.'
    );
  }

  if (
    pagination === null ||
    typeof pagination !== 'object' ||
    Array.isArray(pagination)
  ) {
    throw new TypeError('Pagination metadata input must be an object.');
  }

  const page = toPositiveInteger(
    pagination.page,
    DEFAULT_PAGE
  );

  const limit = toPositiveInteger(
    pagination.limit,
    DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return Object.freeze({
    page,
    limit,
    totalItems: total,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    previousPage: hasPreviousPage ? page - 1 : null,
    nextPage: hasNextPage ? page + 1 : null,
  });
}

module.exports = Object.freeze({
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  getPagination,
  getPaginationMeta,
});

'use strict';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toPositiveInteger(value, fallback) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

function getPagination(query = {}, options = {}) {
  const defaultLimit = toPositiveInteger(
    options.defaultLimit,
    DEFAULT_LIMIT
  );

  const maxLimit = toPositiveInteger(
    options.maxLimit,
    MAX_LIMIT
  );

  const page = toPositiveInteger(
    query.page,
    DEFAULT_PAGE
  );

  const requestedLimit = toPositiveInteger(
    query.limit,
    defaultLimit
  );

  const limit = Math.min(
    requestedLimit,
    maxLimit
  );

  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    throw new RangeError(
      'Pagination offset exceeds the safe integer range.'
    );
  }

  return {
    page,
    limit,
    offset,
  };
}

function getPaginationMeta(
  totalItems,
  pagination
) {
  const total = Number(totalItems);

  if (
    !Number.isSafeInteger(total) ||
    total < 0
  ) {
    throw new TypeError(
      'totalItems must be a non-negative safe integer.'
    );
  }

  const page = toPositiveInteger(
    pagination?.page,
    DEFAULT_PAGE
  );

  const limit = toPositiveInteger(
    pagination?.limit,
    DEFAULT_LIMIT
  );

  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    totalItems: total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
    previousPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
  };
}

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  getPagination,
  getPaginationMeta,
};
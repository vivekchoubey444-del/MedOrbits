'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { unavailable } = require('./controller.helpers');
const searchService = require('../services/search.service');

const controller = {};

/**
 * GET /api/search?q=mbbs&category=medical&page=1&limit=10
 */
controller.search = asyncHandler(async (req, res) => {
  const query = typeof req.query.q === 'string'
    ? req.query.q.trim()
    : '';

  if (!query) {
    throw httpError(
      400,
      'SEARCH_QUERY_REQUIRED',
      'Provide a search query using the q parameter.'
    );
  }

  if (query.length > 200) {
    throw httpError(
      400,
      'SEARCH_QUERY_TOO_LONG',
      'Search queries must not exceed 200 characters.'
    );
  }

  if (!searchService || typeof searchService.search !== 'function') {
    unavailable('Search service');
  }

  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

  if (!Number.isSafeInteger(page) || page < 1) {
    throw httpError(400, 'INVALID_PAGE', 'Page must be a positive integer.');
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw httpError(400, 'INVALID_LIMIT', 'Limit must be an integer between 1 and 50.');
  }

  const filters = {
    category: typeof req.query.category === 'string'
      ? req.query.category.trim()
      : undefined,
    country: typeof req.query.country === 'string'
      ? req.query.country.trim()
      : undefined,
    page,
    limit,
  };

  const result = await searchService.search(query, filters);

  if (
    !result ||
    !Array.isArray(result.items) ||
    !result.pagination
  ) {
    throw httpError(
      500,
      'INVALID_SEARCH_RESPONSE',
      'The search service returned an invalid response.'
    );
  }

  return sendSuccess(res, result.items, 200, {
    pagination: result.pagination,
    query,
  });
});

module.exports = controller;
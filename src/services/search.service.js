
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredString,
  safePage,
} = require('./service-utils');

const DEFAULT_SEARCH_TYPES = [
  'courses',
  'colleges',
  'jobs',
  'internships',
];

function createSearchService({
  searchRepository,
  courseRepository,
  collegeRepository,
  jobRepository,
  internshipRepository,
}) {
  const sources = {
    courses: courseRepository,
    colleges: collegeRepository,
    jobs: jobRepository,
    internships: internshipRepository,
  };

  const allowedTypes = new Set([
    ...DEFAULT_SEARCH_TYPES,
    'all',
  ]);

  return {
    async search(input = {}) {
      if (
        !input ||
        typeof input !== 'object' ||
        Array.isArray(input)
      ) {
        throw new ServiceError('Search input must be an object.', {
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }

      const query = requiredString(input.q, 'q', {
        min: 2,
        max: 200,
      });

      const { page, limit, offset } = safePage(input);

      let types;

      if (input.types === undefined || input.types === null) {
        types = [...DEFAULT_SEARCH_TYPES];
      } else if (
        Array.isArray(input.types) &&
        input.types.length > 0 &&
        input.types.every((type) => typeof type === 'string')
      ) {
        types = [...new Set(input.types)];
      } else {
        throw new ServiceError(
          'types must be a non-empty array of supported search types.',
          {
            code: 'VALIDATION_ERROR',
            status: 422,
          },
        );
      }

      const unknown = types.filter(
        (type) => !allowedTypes.has(type),
      );

      if (unknown.length > 0) {
        throw new ServiceError('Unsupported search type.', {
          code: 'VALIDATION_ERROR',
          status: 422,
          details: { allowed: [...allowedTypes] },
        });
      }

      // "all" means search every configured source.
      if (types.includes('all')) {
        types = [...DEFAULT_SEARCH_TYPES];
      }

      /*
       * Prefer the central search repository when it implements
       * search(). The repository is responsible for safe query
       * parameterization, filtering, and pagination.
       */
      if (searchRepository) {
        requireDependency(searchRepository, 'searchRepository');

        if (typeof searchRepository.search === 'function') {
          return searchRepository.search({
            q: query,
            types,
            page,
            limit,
            offset,
          });
        }
      }

      const results = await Promise.all(
        types.map(async (type) => {
          const repository = sources[type];

          if (!repository) {
            return {
              type,
              items: [],
            };
          }

          if (typeof repository.search !== 'function') {
            return {
              type,
              items: [],
            };
          }

          const items = await repository.search({
            q: query,
            limit,
            offset,
          });

          return {
            type,
            items: Array.isArray(items) ? items : [],
          };
        }),
      );

      return {
        query,
        page,
        limit,
        results,
      };
    },
  };
}

module.exports = { createSearchService };

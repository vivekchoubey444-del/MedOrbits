'use strict';
const { requireDependency, requiredString, safePage } = require('./service-utils');
function createSearchService({ searchRepository, courseRepository, collegeRepository, jobRepository, internshipRepository }) {
  const sources = { courses: courseRepository, colleges: collegeRepository, jobs: jobRepository, internships: internshipRepository };
  return {
    async search(input = {}) {
      const query = requiredString(input.q, 'q', { min: 2, max: 200 });
      const { page, limit, offset } = safePage(input);
      const types = Array.isArray(input.types) && input.types.length ? input.types : Object.keys(sources);
      const unknown = types.filter((type) => !sources[type] && type !== 'all');
      if (unknown.length) throw Object.assign(new Error('Unsupported search type.'), { code: 'VALIDATION_ERROR', status: 422 });
      if (searchRepository && typeof searchRepository.search === 'function') return searchRepository.search({ q: query, types, page, limit, offset });
      const results = await Promise.all(types.filter((type) => type !== 'all').map(async (type) => {
        const repo = sources[type]; if (!repo || typeof repo.search !== 'function') return { type, items: [] };
        return { type, items: await repo.search({ q: query, limit, offset }) };
      }));
      return { query, page, limit, results };
    },
  };
}
module.exports = { createSearchService };

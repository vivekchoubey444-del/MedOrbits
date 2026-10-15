'use strict';

// Synthetic fixture factory. Adapt fields to the actual course model.
function makeCourse(overrides = {}) {
  return {
    id: 'test-course-001',
    name: 'Example Course',
    category: 'education',
    published: true,
    ...overrides,
  };
}

module.exports = { makeCourse };

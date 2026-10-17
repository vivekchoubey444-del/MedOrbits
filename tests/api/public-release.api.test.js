'use strict';

const express = require('express');
const request = require('supertest');
const publicReleaseRoutes = require('../../src/routes/public-release.routes');

const app = express();
app.use('/api/v1/public-releases', publicReleaseRoutes);

describe('GET /api/v1/public-releases', () => {
  test('returns published bulletins and pagination totals', async () => {
    const response = await request(app)
      .get('/api/v1/public-releases?limit=1')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.notices).toEqual([]);
    expect(response.body.data.bulletins).toHaveLength(1);
    expect(response.body.pagination.total.bulletins).toBe(2);
    expect(response.body.data.bulletins[0].publicationStatus).toBe('published');
  });
});
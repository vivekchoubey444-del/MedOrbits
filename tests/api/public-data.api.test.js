'use strict';

const express = require('express');
const request = require('supertest');
const publicDataRoutes = require('../../src/routes/public-data.routes');

function createApp() {
  const app = express();
  app.use('/api/v1/public-data', publicDataRoutes);
  app.use((error, req, res, next) => {
    res.status(error.statusCode || error.status || 500).json({
      success: false,
      error: { code: error.code || 'INTERNAL_ERROR', message: error.message },
    });
  });
  return app;
}

describe('public data API', () => {
  test('serves the canonical public university snapshot', async () => {
    const response = await request(createApp()).get('/api/v1/public-data/universities');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.universities.length).toBeGreaterThan(0);
    expect(response.body.updatedAt).toBeTruthy();
  });

  test('does not serve arbitrary files as datasets', async () => {
    const response = await request(createApp()).get('/api/v1/public-data/server');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PUBLIC_DATASET_NOT_FOUND');
  });
});
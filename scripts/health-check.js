'use strict';

require('dotenv').config();

const url =
  process.env.HEALTH_URL ||
  `http://localhost:${process.env.PORT || 3000}/health`;

fetch(url, { signal: AbortSignal.timeout(5000) })
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`Healthy: ${url}`);
  })
  .catch((err) => {
    console.error(`Health check failed for ${url}: ${err.message}`);
    process.exit(1);
  });

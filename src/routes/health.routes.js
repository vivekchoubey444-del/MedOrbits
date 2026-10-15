'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'medorbits-api',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    requestId: req.id || null,
  });
});

router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
    requestId: req.id || null,
  });
});

/*
 * This route checks only process availability. Connect real database/cache
 * checks before describing the service as ready for production traffic.
 */
router.get('/ready', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ready',
    dependenciesChecked: false,
    timestamp: new Date().toISOString(),
    requestId: req.id || null,
  });
});

module.exports = router;

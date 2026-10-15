'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('admin.controller.js');

// Mounted at /api/v1/admin

router.get('/overview', asyncHandler(handler(controller, 'overview', 'Get admin overview')));
router.get('/users', asyncHandler(handler(controller, 'users', 'List admin users')));
router.get('/applications', asyncHandler(handler(controller, 'applications', 'List admin applications')));
router.get('/payments', asyncHandler(handler(controller, 'payments', 'List admin payments')));
router.get('/audit-logs', asyncHandler(handler(controller, 'auditLogs', 'List audit logs')));
router.patch('/users/:id/role', asyncHandler(handler(controller, 'updateUserRole', 'Update user role')));
router.patch('/applications/:id/status', asyncHandler(handler(controller, 'updateApplicationStatus', 'Update application status')));

module.exports = router;

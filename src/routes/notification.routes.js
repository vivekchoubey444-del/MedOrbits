'use strict';

const express = require('express');
const { loadController, handler, asyncHandler } = require('./route-utils');
const router = express.Router();
const controller = loadController('notification.controller.js');

// Mounted at /api/v1/notifications

router.get('/', asyncHandler(handler(controller, 'list', 'List notifications')));
router.get('/unread-count', asyncHandler(handler(controller, 'unreadCount', 'Count unread notifications')));
router.patch('/:id/read', asyncHandler(handler(controller, 'markRead', 'Mark notification as read')));
router.post('/read-all', asyncHandler(handler(controller, 'markAllRead', 'Mark all notifications as read')));
router.delete('/:id', asyncHandler(handler(controller, 'remove', 'Delete notification')));

module.exports = router;

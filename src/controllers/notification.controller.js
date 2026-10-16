'use strict';

const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { idFrom, requireUser } = require('./controller.helpers');
const repository = require('../repositories/notification.repository');

const controller = {};

/**
 * GET /notifications
 * List notifications for the authenticated user.
 */
controller.list = asyncHandler(async (req, res) => {
  const user = requireUser(req);

  const result = await repository.listForUser(user.id, req.query);

  if (
    !result ||
    !Array.isArray(result.items) ||
    !result.pagination
  ) {
    throw httpError(
      500,
      'INVALID_REPOSITORY_RESPONSE',
      'The notification repository returned an invalid list response.'
    );
  }

  return sendSuccess(res, result.items, 200, {
    pagination: result.pagination,
  });
});

/**
 * GET /notifications/:id
 * Retrieve a notification belonging to the authenticated user.
 */
controller.get = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const id = idFrom(req);

  const notification = await repository.findForUser(id, user.id);

  if (!notification) {
    throw httpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
  }

  return sendSuccess(res, notification);
});

/**
 * PATCH /notifications/:id/read
 * Mark a notification as read.
 */
controller.markRead = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const id = idFrom(req);

  const notification = await repository.markReadForUser(id, user.id);

  if (!notification) {
    throw httpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
  }

  return sendSuccess(res, notification);
});

module.exports = controller;
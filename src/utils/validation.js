'use strict';

const { httpError } = require('./http');

function objectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }
  return body;
}

function requiredString(value, field, max = 255) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw httpError(400, 'VALIDATION_ERROR', `${field} is required and must be at most ${max} characters.`);
  }
  return value.trim();
}

function optionalString(value, field, max = 5000) {
  if (value == null) return null;
  if (typeof value !== 'string' || value.length > max) {
    throw httpError(400, 'VALIDATION_ERROR', `${field} must be a string of at most ${max} characters.`);
  }
  return value.trim();
}

function email(value) {
  const normalized = requiredString(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw httpError(400, 'VALIDATION_ERROR', 'Enter a valid email address.');
  }
  return normalized;
}

function positiveId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError(400, 'INVALID_ID', `${field} must be a positive integer.`);
  }
  return id;
}

module.exports = { objectBody, requiredString, optionalString, email, positiveId };

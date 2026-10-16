
'use strict';

/**
 * MedOrbits -- Validation Utilities
 *
 * File: src/utils/validation.js
 *
 * Provides reusable validation for:
 * - JSON object request bodies.
 * - Required and optional strings.
 * - Email addresses.
 * - Positive integer resource IDs.
 *
 * Validation errors are forwarded to centralized Express error middleware.
 */

const { httpError } = require('./http');

const DEFAULT_STRING_MAX_LENGTH = 255;
const DEFAULT_OPTIONAL_STRING_MAX_LENGTH = 5000;
const MAX_EMAIL_LENGTH = 254;

function objectBody(body) {
  if (
    body === null ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    throw httpError(
      400,
      'INVALID_BODY',
      'Request body must be a JSON object.'
    );
  }

  return body;
}

function requiredString(
  value,
  field,
  max = DEFAULT_STRING_MAX_LENGTH
) {
  if (
    typeof field !== 'string' ||
    !field.trim()
  ) {
    throw new TypeError('A valid field name is required.');
  }

  if (
    !Number.isSafeInteger(max) ||
    max < 1
  ) {
    throw new TypeError(
      'Maximum string length must be a positive safe integer.'
    );
  }

  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.trim().length > max
  ) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      `${field} is required and must be at most ${max} characters.`
    );
  }

  return value.trim();
}

function optionalString(
  value,
  field,
  max = DEFAULT_OPTIONAL_STRING_MAX_LENGTH
) {
  if (
    typeof field !== 'string' ||
    !field.trim()
  ) {
    throw new TypeError('A valid field name is required.');
  }

  if (
    !Number.isSafeInteger(max) ||
    max < 0
  ) {
    throw new TypeError(
      'Maximum string length must be a non-negative safe integer.'
    );
  }

  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    value.length > max
  ) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      `${field} must be a string of at most ${max} characters.`
    );
  }

  return value.trim();
}

function email(value) {
  const normalized = requiredString(
    value,
    'email',
    MAX_EMAIL_LENGTH
  ).toLowerCase();

  // Practical format check; this does not verify mailbox existence.
  const emailPattern =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (
    normalized.length > MAX_EMAIL_LENGTH ||
    !emailPattern.test(normalized)
  ) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      'Enter a valid email address.'
    );
  }

  return normalized;
}

function positiveId(value, field = 'id') {
  if (
    typeof field !== 'string' ||
    !field.trim()
  ) {
    throw new TypeError('A valid ID field name is required.');
  }

  let id;

  if (typeof value === 'number') {
    id = value;
  } else if (
    typeof value === 'string' &&
    /^\d+$/.test(value.trim())
  ) {
    id = Number(value.trim());
  } else {
    throw httpError(
      400,
      'INVALID_ID',
      `${field} must be a positive integer.`
    );
  }

  if (
    !Number.isSafeInteger(id) ||
    id < 1
  ) {
    throw httpError(
      400,
      'INVALID_ID',
      `${field} must be a positive integer.`
    );
  }

  return id;
}

module.exports = Object.freeze({
  objectBody,
  requiredString,
  optionalString,
  email,
  positiveId,
});

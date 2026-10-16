
'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'user_id',
  'course_id',
  'college_id',
  'status',
  'intake_year',
  'notes',
]);

const ALLOWED_STATUSES = Object.freeze([
  'draft',
  'pending',
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'withdrawn',
]);

const MAX_NOTES_LENGTH = 5000;

function validationError(message, code = 'VALIDATION_ERROR') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  error.publicMessage = message;
  return error;
}

function pickAllowed(input = {}) {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw validationError(
      'Request body must be a JSON object.',
      'INVALID_BODY'
    );
  }

  const unknownFields = Object.keys(input).filter(
    (key) => !ALLOWED_FIELDS.includes(key)
  );

  if (unknownFields.length > 0) {
    throw validationError(
      `Unsupported field(s): ${unknownFields.join(', ')}.`,
      'UNKNOWN_FIELDS'
    );
  }

  const output = {};

  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      output[key] = input[key];
    }
  }

  return output;
}

function validate(input = {}, options = {}) {
  const data = pickAllowed(input);
  const { partial = false } = options;

  if (Object.keys(data).length === 0) {
    throw validationError(
      'At least one supported field must be provided.'
    );
  }

  for (const key of ['user_id', 'course_id', 'college_id']) {
    if (data[key] === undefined) continue;

    if (
      !Number.isSafeInteger(data[key]) ||
      data[key] < 1
    ) {
      throw validationError(
        `${key} must be a positive integer.`
      );
    }
  }

  if (data.intake_year !== undefined) {
    if (
      !Number.isSafeInteger(data.intake_year) ||
      data.intake_year < 2000 ||
      data.intake_year > 2100
    ) {
      throw validationError(
        'intake_year must be an integer between 2000 and 2100.'
      );
    }
  }

  if (data.status !== undefined) {
    if (typeof data.status !== 'string') {
      throw validationError('status must be a string.');
    }

    data.status = data.status.trim().toLowerCase();

    if (!ALLOWED_STATUSES.includes(data.status)) {
      throw validationError(
        `status must be one of: ${ALLOWED_STATUSES.join(', ')}.`
      );
    }
  }

  if (data.notes !== undefined) {
    if (typeof data.notes !== 'string') {
      throw validationError('notes must be a string.');
    }

    data.notes = data.notes.trim();

    if (data.notes.length > MAX_NOTES_LENGTH) {
      throw validationError(
        `notes must not exceed ${MAX_NOTES_LENGTH} characters.`
      );
    }
  }

  if (!partial) {
    if (data.course_id === undefined) {
      throw validationError('course_id is required.');
    }

    if (data.college_id === undefined) {
      throw validationError('college_id is required.');
    }

    if (data.intake_year === undefined) {
      throw validationError('intake_year is required.');
    }
  }

  return data;
}

function validateCreate(input) {
  return validate(input);
}

function validateUpdate(input) {
  return validate(input, { partial: true });
}

module.exports = {
  ALLOWED_FIELDS,
  ALLOWED_STATUSES,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
};

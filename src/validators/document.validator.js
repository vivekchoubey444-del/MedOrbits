
'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'user_id',
  'application_id',
  'candidate_id',
  'document_type',
  'title',
  'description',
  'original_filename',
  'mime_type',
  'file_size',
  'storage_key',
  'status',
  'is_public',
  'expires_at',
]);

const ALLOWED_DOCUMENT_TYPES = Object.freeze([
  'identity',
  'passport',
  'photograph',
  'signature',
  'academic_transcript',
  'marksheet',
  'degree_certificate',
  'entrance_exam_scorecard',
  'admission_letter',
  'resume',
  'experience_certificate',
  'income_certificate',
  'caste_certificate',
  'domicile_certificate',
  'medical_certificate',
  'payment_receipt',
  'other',
]);

const ALLOWED_STATUSES = Object.freeze([
  'pending',
  'uploaded',
  'verified',
  'rejected',
  'expired',
  'archived',
]);

const ALLOWED_MIME_TYPES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_FILENAME_LENGTH = 255;

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
    (field) => !ALLOWED_FIELDS.includes(field)
  );

  if (unknownFields.length > 0) {
    throw validationError(
      `Unsupported field(s): ${unknownFields.join(', ')}.`,
      'UNKNOWN_FIELDS'
    );
  }

  const output = {};

  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      output[field] = input[field];
    }
  }

  return output;
}

function validateDate(value, field) {
  if (typeof value !== 'string') {
    throw validationError(`${field} must be an ISO date string or null.`);
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime()) ||
    !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) ||
    date.toISOString().slice(0, 10) !== value.slice(0, 10)
  ) {
    throw validationError(`${field} must be a valid ISO date.`);
  }

  return date.toISOString();
}

function validate(input = {}, options = {}) {
  const { partial = false } = options;
  const data = pickAllowed(input);

  if (Object.keys(data).length === 0) {
    throw validationError(
      'At least one supported field must be provided.'
    );
  }

  for (const field of [
    'user_id',
    'application_id',
    'candidate_id',
  ]) {
    if (data[field] === undefined) continue;

    if (
      !Number.isSafeInteger(data[field]) ||
      data[field] < 1
    ) {
      throw validationError(
        `${field} must be a positive integer.`
      );
    }
  }

  for (const field of ['title', 'description', 'original_filename']) {
    if (data[field] === undefined) continue;

    if (typeof data[field] !== 'string') {
      throw validationError(`${field} must be a string.`);
    }

    data[field] = data[field].trim();
  }

  if (data.title !== undefined) {
    if (
      data.title.length < 1 ||
      data.title.length > MAX_TITLE_LENGTH
    ) {
      throw validationError(
        `title must contain between 1 and ${MAX_TITLE_LENGTH} characters.`
      );
    }
  }

  if (data.description !== undefined &&
      data.description.length > MAX_DESCRIPTION_LENGTH) {
    throw validationError(
      `description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`
    );
  }

  if (data.original_filename !== undefined) {
    if (
      data.original_filename.length < 1 ||
      data.original_filename.length > MAX_FILENAME_LENGTH ||
      /[\\/]/.test(data.original_filename) ||
      /[\u0000-\u001f\u007f]/.test(data.original_filename)
    ) {
      throw validationError(
        'original_filename must be a filename without path separators or control characters.'
      );
    }
  }

  if (data.document_type !== undefined) {
    if (typeof data.document_type !== 'string') {
      throw validationError('document_type must be a string.');
    }

    data.document_type = data.document_type.trim().toLowerCase();

    if (!ALLOWED_DOCUMENT_TYPES.includes(data.document_type)) {
      throw validationError(
        `document_type must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}.`
      );
    }
  }

  if (data.mime_type !== undefined) {
    if (
      typeof data.mime_type !== 'string' ||
      !ALLOWED_MIME_TYPES.includes(data.mime_type.trim().toLowerCase())
    ) {
      throw validationError(
        `mime_type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}.`
      );
    }

    data.mime_type = data.mime_type.trim().toLowerCase();
  }

  if (data.file_size !== undefined) {
    if (
      !Number.isSafeInteger(data.file_size) ||
      data.file_size < 1 ||
      data.file_size > MAX_FILE_SIZE
    ) {
      throw validationError(
        `file_size must be between 1 byte and ${MAX_FILE_SIZE} bytes.`
      );
    }
  }

  if (data.storage_key !== undefined) {
    throw validationError(
      'storage_key is server-managed and cannot be supplied by clients.',
      'PROTECTED_FIELD'
    );
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

    // Verification and rejection must be performed by authorized workflows.
    if (['verified', 'rejected', 'archived'].includes(data.status)) {
      throw validationError(
        `status "${data.status}" can only be set through an authorized workflow.`,
        'PROTECTED_FIELD'
      );
    }
  }

  if (data.is_public !== undefined) {
    if (typeof data.is_public !== 'boolean') {
      throw validationError('is_public must be a boolean.');
    }

    if (data.is_public === true) {
      throw validationError(
        'Documents cannot be made public through this validator.',
        'PROTECTED_FIELD'
      );
    }
  }

  if (data.expires_at !== undefined && data.expires_at !== null) {
    data.expires_at = validateDate(data.expires_at, 'expires_at');
  }

  if (!partial) {
    for (const field of ['document_type', 'title']) {
      if (!data[field]) {
        throw validationError(`${field} is required.`);
      }
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
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_STATUSES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
};

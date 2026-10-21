
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

const CLIENT_WRITABLE_STATUSES = Object.freeze([
  'pending',
  'uploaded',
  'expired',
]);

const PROTECTED_FIELDS = Object.freeze([
  'storage_key',
  'status',
  'is_public',
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_FILENAME_LENGTH = 255;
const MAX_DATE_LENGTH = 40;

const CONTROL_CHARACTERS_REGEX = /[\u0000-\u001F\u007F]/;
const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validationError(
  message,
  code = 'VALIDATION_ERROR',
  field
) {
  const error = new Error(message);

  error.name = 'ValidationError';
  error.status = 400;
  error.statusCode = 400;
  error.code = code;
  error.publicMessage = message;

  if (field) {
    error.field = field;
  }

  return error;
}

function isPlainObject(input) {
  if (input === null || typeof input !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(input);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function pickAllowed(input = {}) {
  if (!isPlainObject(input)) {
    throw validationError(
      'Request body must be a plain JSON object.',
      'INVALID_BODY',
      'body'
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

  const output = Object.create(null);

  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      output[field] = input[field];
    }
  }

  return output;
}

function requirePositiveId(value, field) {
  let id = value;

  if (typeof value === 'string' && /^[1-9]\d*$/.test(value.trim())) {
    id = Number(value.trim());
  }

  if (!Number.isSafeInteger(id) || id < 1) {
    throw validationError(
      `${field} must be a positive integer.`,
      'INVALID_ID',
      field
    );
  }

  return id;
}

function normalizeString(
  value,
  field,
  { minLength = 0, maxLength = 255 } = {}
) {
  if (typeof value !== 'string') {
    throw validationError(
      `${field} must be a string.`,
      'INVALID_TYPE',
      field
    );
  }

  const result = value.trim();

  if (CONTROL_CHARACTERS_REGEX.test(result)) {
    throw validationError(
      `${field} must not contain control characters.`,
      'INVALID_FORMAT',
      field
    );
  }

  if (
    result.length < minLength ||
    result.length > maxLength
  ) {
    throw validationError(
      `${field} must contain between ${minLength} and ${maxLength} characters.`,
      'OUT_OF_RANGE',
      field
    );
  }

  return result;
}

function validateEnum(value, field, allowedValues) {
  const normalized = normalizeString(value, field, {
    minLength: 1,
    maxLength: 100,
  }).toLowerCase();

  if (!allowedValues.includes(normalized)) {
    throw validationError(
      `${field} must be one of: ${allowedValues.join(', ')}.`,
      'INVALID_ENUM',
      field
    );
  }

  return normalized;
}

function validateDate(value, field) {
  if (typeof value !== 'string') {
    throw validationError(
      `${field} must be an ISO date-time string or null.`,
      'INVALID_DATE',
      field
    );
  }

  if (
    value.length > MAX_DATE_LENGTH ||
    !ISO_DATE_REGEX.test(value)
  ) {
    throw validationError(
      `${field} must use an ISO 8601 date-time with a timezone.`,
      'INVALID_DATE',
      field
    );
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw validationError(
      `${field} must be a valid ISO 8601 date-time.`,
      'INVALID_DATE',
      field
    );
  }

  const datePart = value.slice(0, 10);
  const calendarDate = new Date(`${datePart}T00:00:00.000Z`);

  if (
    Number.isNaN(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== datePart
  ) {
    throw validationError(
      `${field} must contain a valid calendar date.`,
      'INVALID_DATE',
      field
    );
  }

  return new Date(timestamp).toISOString();
}

function validate(input = {}, options = {}) {
  const {
    partial = false,
    mode = 'client',
    allowProtectedFields = false,
  } = options;

  const data = pickAllowed(input);

  if (Object.keys(data).length === 0) {
    throw validationError(
      'At least one supported field must be provided.',
      'EMPTY_INPUT'
    );
  }

  const trustedMode = mode === 'system';

  // Server-managed fields are never accepted in client mode.
  if (!trustedMode && !allowProtectedFields) {
    for (const field of PROTECTED_FIELDS) {
      if (data[field] !== undefined) {
        throw validationError(
          `${field} is server-managed and cannot be supplied by clients.`,
          'PROTECTED_FIELD',
          field
        );
      }
    }
  }

  for (const field of [
    'user_id',
    'application_id',
    'candidate_id',
  ]) {
    if (data[field] !== undefined) {
      data[field] = requirePositiveId(data[field], field);
    }
  }

  if (data.title !== undefined) {
    data.title = normalizeString(data.title, 'title', {
      minLength: 1,
      maxLength: MAX_TITLE_LENGTH,
    });
  }

  if (data.description !== undefined) {
    data.description = normalizeString(
      data.description,
      'description',
      {
        minLength: 0,
        maxLength: MAX_DESCRIPTION_LENGTH,
      }
    );
  }

  if (data.original_filename !== undefined) {
    data.original_filename = normalizeString(
      data.original_filename,
      'original_filename',
      {
        minLength: 1,
        maxLength: MAX_FILENAME_LENGTH,
      }
    );

    if (
      /[\\/]/.test(data.original_filename) ||
      data.original_filename === '.' ||
      data.original_filename === '..'
    ) {
      throw validationError(
        'original_filename must be a filename without path separators.',
        'INVALID_FILENAME',
        'original_filename'
      );
    }
  }

  if (data.document_type !== undefined) {
    data.document_type = validateEnum(
      data.document_type,
      'document_type',
      ALLOWED_DOCUMENT_TYPES
    );
  }

  if (data.mime_type !== undefined) {
    data.mime_type = normalizeString(
      data.mime_type,
      'mime_type',
      {
        minLength: 1,
        maxLength: 100,
      }
    ).toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(data.mime_type)) {
      throw validationError(
        `mime_type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}.`,
        'INVALID_MIME_TYPE',
        'mime_type'
      );
    }
  }

  if (data.file_size !== undefined) {
    if (
      !Number.isSafeInteger(data.file_size) ||
      data.file_size < 1 ||
      data.file_size > MAX_FILE_SIZE
    ) {
      throw validationError(
        `file_size must be between 1 byte and ${MAX_FILE_SIZE} bytes.`,
        'INVALID_FILE_SIZE',
        'file_size'
      );
    }
  }

  if (data.status !== undefined) {
    data.status = validateEnum(
      data.status,
      'status',
      ALLOWED_STATUSES
    );

    if (
      !trustedMode &&
      !allowProtectedFields &&
      !CLIENT_WRITABLE_STATUSES.includes(data.status)
    ) {
      throw validationError(
        `status "${data.status}" can only be set through an authorized workflow.`,
        'PROTECTED_FIELD',
        'status'
      );
    }
  }

  if (data.is_public !== undefined) {
    if (typeof data.is_public !== 'boolean') {
      throw validationError(
        'is_public must be a boolean.',
        'INVALID_TYPE',
        'is_public'
      );
    }

    if (
      data.is_public === true &&
      !trustedMode &&
      !allowProtectedFields
    ) {
      throw validationError(
        'Documents cannot be made public through this validator.',
        'PROTECTED_FIELD',
        'is_public'
      );
    }
  }

  if (data.storage_key !== undefined) {
    if (typeof data.storage_key !== 'string') {
      throw validationError(
        'storage_key must be a string.',
        'INVALID_TYPE',
        'storage_key'
      );
    }

    data.storage_key = normalizeString(
      data.storage_key,
      'storage_key',
      {
        minLength: 1,
        maxLength: 1024,
      }
    );
  }

  if (data.expires_at !== undefined && data.expires_at !== null) {
    data.expires_at = validateDate(data.expires_at, 'expires_at');
  }

  if (!partial) {
    for (const field of ['document_type', 'title']) {
      if (data[field] === undefined || data[field] === '') {
        throw validationError(
          `${field} is required.`,
          'REQUIRED_FIELD',
          field
        );
      }
    }
  }

  return data;
}

function validateCreate(input) {
  return validate(input, {
    partial: false,
    mode: 'client',
  });
}

function validateUpdate(input) {
  return validate(input, {
    partial: true,
    mode: 'client',
  });
}

function validateSystemCreate(input) {
  return validate(input, {
    partial: false,
    mode: 'system',
  });
}

function validateSystemUpdate(input) {
  return validate(input, {
    partial: true,
    mode: 'system',
  });
}

module.exports = {
  ALLOWED_FIELDS,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_STATUSES,
  ALLOWED_MIME_TYPES,
  CLIENT_WRITABLE_STATUSES,
  PROTECTED_FIELDS,
  MAX_FILE_SIZE,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
  validateSystemCreate,
  validateSystemUpdate,
  validateDate,
  requirePositiveId,
};

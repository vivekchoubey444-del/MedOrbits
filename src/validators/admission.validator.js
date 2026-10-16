
'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'user_id',
  'course_id',
  'college_id',
  'university_id',
  'application_id',
  'academic_year',
  'intake_year',
  'status',
  'admission_type',
  'notes',
]);

const ALLOWED_STATUSES = Object.freeze([
  'draft',
  'pending',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
]);

const ALLOWED_ADMISSION_TYPES = Object.freeze([
  'merit',
  'management',
  'international',
  'transfer',
  'other',
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
  const { partial = false } = options;
  const data = pickAllowed(input);

  if (Object.keys(data).length === 0) {
    throw validationError(
      'At least one supported field must be provided.'
    );
  }

  const idFields = [
    'user_id',
    'course_id',
    'college_id',
    'university_id',
    'application_id',
  ];

  for (const field of idFields) {
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

  if (data.academic_year !== undefined) {
    if (
      typeof data.academic_year !== 'string' ||
      !/^\d{4}-\d{4}$/.test(data.academic_year.trim())
    ) {
      throw validationError(
        'academic_year must use the YYYY-YYYY format.'
      );
    }

    const [start, end] = data.academic_year
      .trim()
      .split('-')
      .map(Number);

    if (end !== start + 1) {
      throw validationError(
        'academic_year must contain consecutive years.'
      );
    }

    data.academic_year = `${start}-${end}`;
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

  if (data.admission_type !== undefined) {
    if (typeof data.admission_type !== 'string') {
      throw validationError('admission_type must be a string.');
    }

    data.admission_type = data.admission_type.trim().toLowerCase();

    if (!ALLOWED_ADMISSION_TYPES.includes(data.admission_type)) {
      throw validationError(
        `admission_type must be one of: ${ALLOWED_ADMISSION_TYPES.join(', ')}.`
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
    const hasAcademicYear =
      data.academic_year !== undefined ||
      data.intake_year !== undefined;

    if (!hasAcademicYear) {
      throw validationError(
        'academic_year or intake_year is required.'
      );
    }

    if (
      data.application_id === undefined &&
      (
        data.course_id === undefined ||
        (
          data.college_id === undefined &&
          data.university_id === undefined
        )
      )
    ) {
      throw validationError(
        'Provide application_id, or provide course_id and a college_id or university_id.'
      );
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
  ALLOWED_ADMISSION_TYPES,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
};

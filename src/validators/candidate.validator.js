
'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'user_id',
  'first_name',
  'last_name',
  'email',
  'phone',
  'headline',
  'summary',
  'location',
  'skills',
  'experience_years',
  'education',
  'resume_document_id',
  'availability',
  'status',
]);

const ALLOWED_AVAILABILITY = Object.freeze([
  'immediate',
  'within_15_days',
  'within_30_days',
  'within_60_days',
  'not_available',
]);

const ALLOWED_STATUSES = Object.freeze([
  'draft',
  'active',
  'inactive',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUMMARY_LENGTH = 5000;
const MAX_SKILLS = 50;
const MAX_SKILL_LENGTH = 100;

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

  // Identity must be derived from authentication for ordinary users.
  // user_id is retained here only for explicitly authorized workflows.
  if (data.user_id !== undefined) {
    if (
      !Number.isSafeInteger(data.user_id) ||
      data.user_id < 1
    ) {
      throw validationError('user_id must be a positive integer.');
    }
  }

  for (const field of ['first_name', 'last_name']) {
    if (data[field] === undefined) continue;

    if (typeof data[field] !== 'string') {
      throw validationError(`${field} must be a string.`);
    }

    data[field] = data[field].trim();

    if (data[field].length < 1 || data[field].length > 100) {
      throw validationError(
        `${field} must contain between 1 and 100 characters.`
      );
    }
  }

  if (data.email !== undefined) {
    if (typeof data.email !== 'string') {
      throw validationError('A valid email address is required.');
    }

    data.email = data.email.trim().toLowerCase();

    if (
      data.email.length > 254 ||
      !EMAIL_REGEX.test(data.email)
    ) {
      throw validationError('A valid email address is required.');
    }
  }

  if (data.phone !== undefined) {
    if (typeof data.phone !== 'string') {
      throw validationError('phone must be a string.');
    }

    data.phone = data.phone.trim();

    if (
      data.phone.length < 7 ||
      data.phone.length > 25 ||
      !/^[+()\d\s.-]+$/.test(data.phone)
    ) {
      throw validationError('A valid phone number is required.');
    }
  }

  for (const field of ['headline', 'location']) {
    if (data[field] === undefined) continue;

    if (typeof data[field] !== 'string') {
      throw validationError(`${field} must be a string.`);
    }

    data[field] = data[field].trim();

    if (data[field].length > 200) {
      throw validationError(
        `${field} must not exceed 200 characters.`
      );
    }
  }

  if (data.summary !== undefined) {
    if (typeof data.summary !== 'string') {
      throw validationError('summary must be a string.');
    }

    data.summary = data.summary.trim();

    if (data.summary.length > MAX_SUMMARY_LENGTH) {
      throw validationError(
        `summary must not exceed ${MAX_SUMMARY_LENGTH} characters.`
      );
    }
  }

  if (data.skills !== undefined) {
    if (
      !Array.isArray(data.skills) ||
      data.skills.length > MAX_SKILLS
    ) {
      throw validationError(
        `skills must be an array containing at most ${MAX_SKILLS} entries.`
      );
    }

    data.skills = data.skills.map((skill) => {
      if (typeof skill !== 'string') {
        throw validationError('Each skill must be a string.');
      }

      const normalized = skill.trim();

      if (
        normalized.length < 1 ||
        normalized.length > MAX_SKILL_LENGTH
      ) {
        throw validationError(
          `Each skill must contain between 1 and ${MAX_SKILL_LENGTH} characters.`
        );
      }

      return normalized;
    });

    if (new Set(data.skills.map((skill) => skill.toLowerCase())).size !== data.skills.length) {
      throw validationError('skills must not contain duplicates.');
    }
  }

  if (data.experience_years !== undefined) {
    if (
      typeof data.experience_years !== 'number' ||
      !Number.isFinite(data.experience_years) ||
      data.experience_years < 0 ||
      data.experience_years > 70
    ) {
      throw validationError(
        'experience_years must be a number between 0 and 70.'
      );
    }
  }

  if (data.education !== undefined) {
    if (
      data.education === null ||
      typeof data.education !== 'object' ||
      Array.isArray(data.education)
    ) {
      throw validationError('education must be a JSON object.');
    }

    // Education structure is intentionally restricted until its schema
    // is defined by the application.
    const allowedEducationFields = [
      'qualification',
      'institution',
      'field_of_study',
      'year_completed',
    ];

    const unknownEducationFields = Object.keys(data.education).filter(
      (key) => !allowedEducationFields.includes(key)
    );

    if (unknownEducationFields.length > 0) {
      throw validationError(
        `Unsupported education field(s): ${unknownEducationFields.join(', ')}.`
      );
    }

    for (const [key, value] of Object.entries(data.education)) {
      if (typeof value === 'string') {
        data.education[key] = value.trim();

        if (data.education[key].length > 200) {
          throw validationError(
            `education.${key} must not exceed 200 characters.`
          );
        }
      } else if (
        key === 'year_completed' &&
        Number.isSafeInteger(value) &&
        value >= 1900 &&
        value <= 2100
      ) {
        // Valid completion year.
      } else {
        throw validationError(
          `education.${key} has an invalid value.`
        );
      }
    }
  }

  if (data.resume_document_id !== undefined) {
    if (
      !Number.isSafeInteger(data.resume_document_id) ||
      data.resume_document_id < 1
    ) {
      throw validationError(
        'resume_document_id must be a positive integer.'
      );
    }
  }

  if (data.availability !== undefined) {
    if (
      typeof data.availability !== 'string' ||
      !ALLOWED_AVAILABILITY.includes(data.availability.trim().toLowerCase())
    ) {
      throw validationError(
        `availability must be one of: ${ALLOWED_AVAILABILITY.join(', ')}.`
      );
    }

    data.availability = data.availability.trim().toLowerCase();
  }

  if (data.status !== undefined) {
    if (
      typeof data.status !== 'string' ||
      !ALLOWED_STATUSES.includes(data.status.trim().toLowerCase())
    ) {
      throw validationError(
        `status must be one of: ${ALLOWED_STATUSES.join(', ')}.`
      );
    }

    data.status = data.status.trim().toLowerCase();
  }

  if (!partial) {
    if (!data.first_name) {
      throw validationError('first_name is required.');
    }

    if (!data.last_name) {
      throw validationError('last_name is required.');
    }

    if (!data.email) {
      throw validationError('email is required.');
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
  ALLOWED_AVAILABILITY,
  ALLOWED_STATUSES,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
};


'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'name',
  'email',
  'phone',
  'subject',
  'message',
  'category',
  'source',
]);

const ALLOWED_CATEGORIES = Object.freeze([
  'general',
  'admissions',
  'study_abroad',
  'career',
  'recruitment',
  'partnership',
  'technical_support',
  'feedback',
  'other',
]);

const ALLOWED_SOURCES = Object.freeze([
  'website',
  'email',
  'phone',
  'social_media',
  'referral',
  'other',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = Object.freeze({
  name: 100,
  email: 254,
  phone: 25,
  subject: 200,
  message: 10000,
  source: 50,
});

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

function validate(input = {}, options = {}) {
  const { partial = false } = options;
  const data = pickAllowed(input);

  if (Object.keys(data).length === 0) {
    throw validationError(
      'At least one supported field must be provided.'
    );
  }

  for (const field of [
    'name',
    'email',
    'phone',
    'subject',
    'message',
    'category',
    'source',
  ]) {
    if (data[field] === undefined) continue;

    if (typeof data[field] !== 'string') {
      throw validationError(`${field} must be a string.`);
    }

    data[field] = data[field].trim();
  }

  if (data.name !== undefined) {
    if (data.name.length < 2 || data.name.length > LIMITS.name) {
      throw validationError(
        `name must contain between 2 and ${LIMITS.name} characters.`
      );
    }
  }

  if (data.email !== undefined) {
    data.email = data.email.toLowerCase();

    if (
      data.email.length > LIMITS.email ||
      !EMAIL_REGEX.test(data.email)
    ) {
      throw validationError('A valid email address is required.');
    }
  }

  if (data.phone !== undefined && data.phone !== '') {
    if (
      data.phone.length > LIMITS.phone ||
      !/^[+()\d\s.-]+$/.test(data.phone) ||
      data.phone.replace(/\D/g, '').length < 7
    ) {
      throw validationError('A valid phone number is required.');
    }
  }

  if (data.subject !== undefined) {
    if (
      data.subject.length < 3 ||
      data.subject.length > LIMITS.subject
    ) {
      throw validationError(
        `subject must contain between 3 and ${LIMITS.subject} characters.`
      );
    }
  }

  if (data.message !== undefined) {
    if (
      data.message.length < 10 ||
      data.message.length > LIMITS.message
    ) {
      throw validationError(
        `message must contain between 10 and ${LIMITS.message} characters.`
      );
    }
  }

  if (data.category !== undefined) {
    data.category = data.category.toLowerCase();

    if (!ALLOWED_CATEGORIES.includes(data.category)) {
      throw validationError(
        `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`
      );
    }
  }

  if (data.source !== undefined) {
    data.source = data.source.toLowerCase();

    if (!ALLOWED_SOURCES.includes(data.source)) {
      throw validationError(
        `source must be one of: ${ALLOWED_SOURCES.join(', ')}.`
      );
    }
  }

  if (!partial) {
    for (const field of ['name', 'email', 'subject', 'message']) {
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
  ALLOWED_CATEGORIES,
  ALLOWED_SOURCES,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
};

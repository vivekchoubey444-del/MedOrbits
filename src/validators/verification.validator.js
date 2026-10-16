
'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'email',
  'phone',
  'code',
  'purpose',
]);

const ALLOWED_PURPOSES = Object.freeze([
  'registration',
  'login',
  'password_reset',
  'email_verification',
  'phone_verification',
]);

function validationError(
  message,
  code = 'VALIDATION_ERROR',
  field
) {
  const error = new Error(message);
  error.status = 400;
  error.statusCode = 400;
  error.code = code;
  error.publicMessage = message;

  if (field) error.field = field;

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

  const output = {};

  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      output[key] = input[key];
    }
  }

  return output;
}

function validateEmail(value) {
  if (typeof value !== 'string') {
    throw validationError(
      'A valid email address is required.',
      'VALIDATION_ERROR',
      'email'
    );
  }

  const email = value.trim().toLowerCase();

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw validationError(
      'A valid email address is required.',
      'VALIDATION_ERROR',
      'email'
    );
  }

  return email;
}

function validatePhone(value) {
  if (typeof value !== 'string') {
    throw validationError(
      'A valid phone number is required.',
      'VALIDATION_ERROR',
      'phone'
    );
  }

  const phone = value.trim();

  if (
    phone.length < 5 ||
    phone.length > 30 ||
    !/^[+0-9().\-\s]+$/.test(phone)
  ) {
    throw validationError(
      'A valid phone number is required.',
      'VALIDATION_ERROR',
      'phone'
    );
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length < 5 || digits.length > 15) {
    throw validationError(
      'Phone number must contain between 5 and 15 digits.',
      'VALIDATION_ERROR',
      'phone'
    );
  }

  return phone;
}

function validateCode(value) {
  if (typeof value !== 'string') {
    throw validationError(
      'Verification code must be a string.',
      'VALIDATION_ERROR',
      'code'
    );
  }

  const code = value.trim();

  if (!/^\d{4,8}$/.test(code)) {
    throw validationError(
      'Verification code must contain 4 to 8 digits.',
      'VALIDATION_ERROR',
      'code'
    );
  }

  return code;
}

function validatePurpose(value) {
  if (typeof value !== 'string') {
    throw validationError(
      'A valid verification purpose is required.',
      'VALIDATION_ERROR',
      'purpose'
    );
  }

  const purpose = value.trim().toLowerCase();

  if (!ALLOWED_PURPOSES.includes(purpose)) {
    throw validationError(
      `purpose must be one of: ${ALLOWED_PURPOSES.join(', ')}.`,
      'VALIDATION_ERROR',
      'purpose'
    );
  }

  return purpose;
}

function validate(input = {}) {
  const data = pickAllowed(input);

  if (data.email !== undefined) {
    data.email = validateEmail(data.email);
  }

  if (data.phone !== undefined) {
    data.phone = validatePhone(data.phone);
  }

  if (data.code !== undefined) {
    data.code = validateCode(data.code);
  }

  if (data.purpose !== undefined) {
    data.purpose = validatePurpose(data.purpose);
  }

  if (data.email === undefined && data.phone === undefined) {
    throw validationError(
      'Provide an email address or phone number.',
      'VALIDATION_ERROR'
    );
  }

  if (data.email !== undefined && data.phone !== undefined) {
    throw validationError(
      'Provide either email or phone, not both.',
      'VALIDATION_ERROR'
    );
  }

  return data;
}

module.exports = {
  ALLOWED_FIELDS,
  ALLOWED_PURPOSES,
  pickAllowed,
  validate,
  validateEmail,
  validatePhone,
  validateCode,
  validatePurpose,
};

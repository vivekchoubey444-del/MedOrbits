
'use strict';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_REGISTER_FIELDS = Object.freeze([
  'name',
  'email',
  'password',
]);
const ALLOWED_LOGIN_FIELDS = Object.freeze([
  'email',
  'password',
]);

function validationError(message, code = 'VALIDATION_ERROR') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  error.publicMessage = message;
  return error;
}

function requireObject(input) {
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
}

function rejectUnknownFields(input, allowedFields) {
  const unknown = Object.keys(input).filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknown.length > 0) {
    throw validationError(
      `Unsupported field(s): ${unknown.join(', ')}.`,
      'UNKNOWN_FIELDS'
    );
  }
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw validationError('A valid email address is required.');
  }

  const normalized = email.trim().toLowerCase();

  if (
    normalized.length > 254 ||
    !EMAIL_REGEX.test(normalized)
  ) {
    throw validationError('A valid email address is required.');
  }

  return normalized;
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    throw validationError('Password must be a string.');
  }

  if (password.length < 8 || password.length > 128) {
    throw validationError(
      'Password must contain between 8 and 128 characters.'
    );
  }

  if (password.trim().length === 0) {
    throw validationError('Password cannot be empty.');
  }

  // Do not trim passwords: spaces may be intentional characters.
  return password;
}

function validateRegister(input = {}) {
  requireObject(input);
  rejectUnknownFields(input, ALLOWED_REGISTER_FIELDS);

  if (typeof input.name !== 'string') {
    throw validationError('Name is required.');
  }

  const name = input.name.trim();

  if (name.length < 2 || name.length > 100) {
    throw validationError(
      'Name must contain between 2 and 100 characters.'
    );
  }

  if (input.email === undefined) {
    throw validationError('Email is required.');
  }

  if (input.password === undefined) {
    throw validationError('Password is required.');
  }

  return {
    name,
    email: normalizeEmail(input.email),
    password: validatePassword(input.password),
  };
}

function validateLogin(input = {}) {
  requireObject(input);
  rejectUnknownFields(input, ALLOWED_LOGIN_FIELDS);

  if (input.email === undefined) {
    throw validationError('Email is required.');
  }

  if (input.password === undefined) {
    throw validationError('Password is required.');
  }

  return {
    email: normalizeEmail(input.email),
    password: validatePassword(input.password),
  };
}

function validate(input = {}) {
  return validateLogin(input);
}

module.exports = {
  ALLOWED_REGISTER_FIELDS,
  ALLOWED_LOGIN_FIELDS,
  validate,
  validateLogin,
  validateRegister,
  normalizeEmail,
  validatePassword,
};

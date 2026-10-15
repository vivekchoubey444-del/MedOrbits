'use strict';

const ALLOWED_FIELDS = ["provider", "provider_reference", "amount_minor", "currency", "status"];

function pickAllowed(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Request body must be a JSON object.');
    error.status = 400;
    error.code = 'INVALID_BODY';
    error.publicMessage = error.message;
    throw error;
  }
  const output = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) output[key] = input[key];
  }
  return output;
}

function validate(input = {}) {
  const data = pickAllowed(input);
  if (data.email !== undefined) {
    if (typeof data.email !== 'string' || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
      const error = new Error('A valid email address is required.');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      error.publicMessage = error.message;
      throw error;
    }
    data.email = data.email.trim().toLowerCase();
  }
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') data[key] = value.trim();
  }
  return data;
}

module.exports = { ALLOWED_FIELDS, pickAllowed, validate };

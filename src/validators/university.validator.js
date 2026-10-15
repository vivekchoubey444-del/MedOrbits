'use strict';

const ALLOWED_FIELDS = ['name', 'slug', 'city', 'state', 'country', 'website', 'description', 'status'];
function validate(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Request body must be a JSON object.');
    error.status = 400; error.code = 'INVALID_BODY'; error.publicMessage = error.message; throw error;
  }
  const output = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) output[key] = input[key];
  }
  for (const [key, value] of Object.entries(output)) {
    if (typeof value === 'string') output[key] = value.trim();
  }
  return output;
}
module.exports = { ALLOWED_FIELDS, pickAllowed: validate, validate };

'use strict';

function badRequest(message, details) {
  const error = new Error(message || 'Request validation failed.');
  error.status = 400;
  error.code = 'VALIDATION_ERROR';
  error.publicMessage = error.message;
  if (details) error.details = details;
  return error;
}

/**
 * `validate(schema, { target: 'body'|'params'|'query'|'all' })`
 * Supports Zod (`safeParse`), Joi (`validate`), or a custom function.
 * Custom functions may return true, an error, or `{ valid, errors, value }`.
 */
function validate(schema, options = {}) {
  if (!schema) throw new TypeError('A validation schema or function is required.');
  const target = options.target || 'body';

  return async function validateMiddleware(req, res, next) {
    const targets = target === 'all' ? ['body', 'params', 'query'] : [target];

    try {
      for (const key of targets) {
        const input = req[key] || {};
        let result;

        if (typeof schema.safeParseAsync === 'function') {
          result = await schema.safeParseAsync(input);
          if (!result.success) {
            return next(badRequest('Request validation failed.', result.error.issues));
          }
          req[key] = result.data;
        } else if (typeof schema.safeParse === 'function') {
          result = schema.safeParse(input);
          if (!result.success) {
            return next(badRequest('Request validation failed.', result.error.issues));
          }
          req[key] = result.data;
        } else if (typeof schema.validateAsync === 'function') {
          req[key] = await schema.validateAsync(input, { abortEarly: false, stripUnknown: true });
        } else if (typeof schema.validate === 'function') {
          result = schema.validate(input, { abortEarly: false, stripUnknown: true });
          if (result.error) {
            return next(badRequest('Request validation failed.', result.error.details));
          }
          req[key] = result.value;
        } else if (typeof schema === 'function') {
          result = await schema(input, req);
          if (result instanceof Error) return next(result);
          if (result === false || (result && result.valid === false)) {
            return next(badRequest('Request validation failed.', result.errors));
          }
          if (result && Object.prototype.hasOwnProperty.call(result, 'value')) {
            req[key] = result.value;
          }
        } else {
          throw new TypeError('Unsupported validation schema. Use Zod, Joi, or a function.');
        }
      }
      return next();
    } catch (error) {
      if (error.status) return next(error);
      if (error.isJoi || error.name === 'ZodError') {
        return next(badRequest('Request validation failed.', error.details || error.issues));
      }
      return next(error);
    }
  };
}

module.exports = validate;
module.exports.validate = validate;
module.exports.badRequest = badRequest;

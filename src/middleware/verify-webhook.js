'use strict';

const crypto = require('node:crypto');

/**
 * Generic HMAC-SHA256 raw-body verifier.
 * Use ONLY if the payment provider's official specification matches this
 * exact scheme. Many providers require timestamped or provider-specific
 * canonical signatures and must have a dedicated verifier.
 */
function verifyWebhook(options = {}) {
  const secret = options.secret || process.env.PAYMENT_WEBHOOK_SECRET;
  const headerName = options.headerName || 'x-webhook-signature';
  const prefix = options.prefix || '';

  if (!secret || String(secret).length < 16) {
    throw new Error('A valid webhook signing secret must be configured.');
  }

  return function verifyWebhookMiddleware(req, res, next) {
    if (!Buffer.isBuffer(req.rawBody)) {
      const error = new Error('Raw webhook body is unavailable.');
      error.status = 400;
      error.code = 'WEBHOOK_RAW_BODY_REQUIRED';
      error.publicMessage = error.message;
      return next(error);
    }

    const supplied = req.get(headerName);
    if (!supplied) {
      const error = new Error('Webhook signature is missing.');
      error.status = 401;
      error.code = 'WEBHOOK_SIGNATURE_MISSING';
      error.publicMessage = error.message;
      return next(error);
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('hex');

    const normalized = supplied.startsWith(prefix)
      ? supplied.slice(prefix.length)
      : supplied;

    const a = Buffer.from(normalized, 'hex');
    const b = Buffer.from(expected, 'hex');

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      const error = new Error('Webhook signature is invalid.');
      error.status = 401;
      error.code = 'WEBHOOK_SIGNATURE_INVALID';
      error.publicMessage = error.message;
      return next(error);
    }

    req.webhookVerified = true;
    return next();
  };
}

module.exports = verifyWebhook;

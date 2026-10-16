‘use strict’;

/**

* MedOrbits -- Payment Client
* Provides a provider-independent interface for checkout creation,
* payment retrieval, and webhook verification.
    */

const REQUIRED_METHODS = Object.freeze([
‘createCheckout’,
‘fetchPayment’,
‘verifyWebhook’,
]);

class PaymentClient {
constructor(provider) {
if (!provider || typeof provider !== ‘object’) {
throw new TypeError(‘A payment provider is required.’);
}

for (const method of REQUIRED_METHODS) {
  if (typeof provider[method] !== 'function') {
    throw new TypeError(
      `Payment provider must implement ${method}().`
    );
  }
}
Object.defineProperty(this, 'provider', {
  value: provider,
  enumerable: false,
  writable: false,
  configurable: false,
});

}

async createCheckout(request) {
if (
!request ||
typeof request !== ‘object’ ||
Array.isArray(request)
) {
throw new TypeError(‘Checkout request must be an object.’);
}

return this.provider.createCheckout(request);

}

async fetchPayment(paymentId) {
if (
typeof paymentId !== ‘string’ ||
!paymentId.trim()
) {
throw new TypeError(‘A valid payment ID is required.’);
}

return this.provider.fetchPayment(paymentId);

}

async verifyWebhook(rawBody, headers) {
if (!Buffer.isBuffer(rawBody) && !(rawBody instanceof Uint8Array)) {
throw new TypeError(
‘Webhook verification requires the original raw request bytes.’
);
}

if (!headers || typeof headers !== 'object') {
  throw new TypeError('Webhook headers are required.');
}
// Signature verification must be implemented by the provider adapter.
return this.provider.verifyWebhook(rawBody, headers);

}
}

module.exports = {
PaymentClient,
};
‘use strict’;

/**

* MedOrbits -- Payment Provider Interface
* File: src/integrations/payment/payment.provider.js
* Defines the contract for payment provider adapters.
* Required methods:
* ●	createCheckout(request)
* ●	fetchPayment(paymentId)
* ●	verifyWebhook(rawBody, headers)
* This class does not process payments directly.
    */

const REQUIRED_METHODS = Object.freeze([
‘createCheckout’,
‘fetchPayment’,
‘verifyWebhook’,
]);

class PaymentProvider {
constructor() {
if (new.target === PaymentProvider) {
throw new TypeError(
‘PaymentProvider is an abstract class and cannot be instantiated directly.’
);
}

this.validateImplementation();

}

validateImplementation() {
for (const method of REQUIRED_METHODS) {
if (this[method] === PaymentProvider.prototype[method]) {
throw new TypeError(
${this.constructor.name} must implement ${method}().
);
}

  if (typeof this[method] !== 'function') {
    throw new TypeError(
      `${this.constructor.name} must provide a valid ${method}() method.`
    );
  }
}

}

async createCheckout(_request) {
throw new Error(‘createCheckout() must be implemented by the provider.’);
}

async fetchPayment(_paymentId) {
throw new Error(‘fetchPayment() must be implemented by the provider.’);
}

async verifyWebhook(_rawBody, _headers) {
throw new Error(‘verifyWebhook() must be implemented by the provider.’);
}
}

module.exports = {
PaymentProvider,
};
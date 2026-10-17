'use strict';

/**

* MedOrbits -- Payment Integration Factory
* File: src/integrations/payment/index.js
* Creates the configured payment client and exposes provider interfaces.
* Security:
* ●	Never expose provider credentials to frontend clients.
* ●	Keep payment operations server-side.
* ●	Verify webhook signatures in the webhook handling layer.
* ●	Do not initialize an unconfigured payment provider.
        */

const {
PaymentClient,
} = require('./payment.client');

const {
PaymentProvider,
} = require('./payment.provider');

const {
RazorpayProvider,
} = require('./razorpay.provider');

const {
StripeProvider,
} = require('./stripe.provider');

const {
loadPaymentConfig,
} = require('./payment.config');

const SUPPORTED_PROVIDERS = new Set([
'razorpay',
'stripe',
]);

function validateProvider(provider) {
if (!provider || typeof provider !== 'object') {
throw new TypeError('A valid payment provider is required.');
}

// Verify the minimum provider contract.
// Keep this list aligned with PaymentClient and PaymentProvider.
const requiredMethods = [
'createPayment',
];

for (const method of requiredMethods) {
if (typeof provider[method] !== 'function') {
throw new TypeError(
Payment provider must implement ${method}().
);
}
}

return provider;
}

function createPaymentClient(options = {}) {
if (
!options ||
typeof options !== 'object' ||
Array.isArray(options)
) {
throw new TypeError('Payment options must be an object.');
}

// Dependency injection supports tests and custom implementations.
if (options.provider !== undefined) {
return new PaymentClient(validateProvider(options.provider));
}

const environment = options.env || process.env;
const config = options.config || loadPaymentConfig(environment);

if (!config || typeof config !== 'object') {
throw new TypeError('Payment configuration is invalid.');
}

if (!SUPPORTED_PROVIDERS.has(config.provider)) {
throw new Error(
Unsupported payment provider: ${String(config.provider)}
);
}

let provider;

switch (config.provider) {
case 'razorpay':
provider = RazorpayProvider.fromEnv(environment);
break;

case 'stripe':
  provider = StripeProvider.fromEnv(environment);
  break;
default:
  throw new Error('No payment provider is configured.');

}

return new PaymentClient(validateProvider(provider));
}

module.exports = {
createPaymentClient,
PaymentClient,
PaymentProvider,
RazorpayProvider,
StripeProvider,
loadPaymentConfig,
};
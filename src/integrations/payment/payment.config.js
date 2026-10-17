'use strict';

/**

* MedOrbits -- Payment Configuration
* Reads provider selection, currency, and provider credentials.
* Secrets must remain server-side and must never be returned to clients.
    */

const SUPPORTED_PROVIDERS = Object.freeze([
'razorpay',
'stripe',
]);

const SUPPORTED_CURRENCIES = new Set([
'INR',
'USD',
'EUR',
'GBP',
'AUD',
'CAD',
'SGD',
]);

function readSecret(env, name) {
const value = env[name];

if (value === undefined || value === null) {
return '';
}

if (typeof value !== 'string') {
throw new TypeError(${name} must be a string.);
}

return value.trim();
}

function loadPaymentConfig(env = process.env) {
if (!env || typeof env !== 'object') {
throw new TypeError('Payment environment configuration is required.');
}

const provider = readSecret(env, 'PAYMENT_PROVIDER').toLowerCase();

if (!SUPPORTED_PROVIDERS.includes(provider)) {
throw new Error(
'PAYMENT_PROVIDER must be razorpay or stripe.'
);
}

const currency = (
readSecret(env, 'PAYMENT_CURRENCY') || 'INR'
).toUpperCase();

if (!SUPPORTED_CURRENCIES.has(currency)) {
throw new Error('PAYMENT_CURRENCY is not supported by this configuration.');
}

const config = {
provider,
currency,

razorpay: {
  keyId: readSecret(env, 'RAZORPAY_KEY_ID'),
  keySecret: readSecret(env, 'RAZORPAY_KEY_SECRET'),
  webhookSecret: readSecret(env, 'RAZORPAY_WEBHOOK_SECRET'),
},
stripe: {
  secretKey: readSecret(env, 'STRIPE_SECRET_KEY'),
  webhookSecret: readSecret(env, 'STRIPE_WEBHOOK_SECRET'),
},

};

if (provider === 'razorpay') {
if (!config.razorpay.keyId || !config.razorpay.keySecret) {
throw new Error(
'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.'
);
}

if (!config.razorpay.webhookSecret) {
  throw new Error(
    'RAZORPAY_WEBHOOK_SECRET is required for webhook verification.'
  );
}

}

if (provider === 'stripe') {
if (!config.stripe.secretKey) {
throw new Error('STRIPE_SECRET_KEY is required.');
}

if (!config.stripe.webhookSecret) {
  throw new Error(
    'STRIPE_WEBHOOK_SECRET is required for webhook verification.'
  );
}

}

for (const providerConfig of [
config.razorpay,
config.stripe,
]) {
Object.freeze(providerConfig);
}

return Object.freeze(config);
}

module.exports = {
loadPaymentConfig,
};
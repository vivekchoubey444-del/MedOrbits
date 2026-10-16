‘use strict’;

/**

* MedOrbits -- Payment Configuration
* File: src/config/payment.js
* Responsibilities:
* ●	Centralize payment provider configuration.
* ●	Validate enabled providers and required credentials.
* ●	Prevent ambiguous multi-provider configuration.
* ●	Validate payment mode and currency.
* ●	Keep payment secrets out of logs and public responses.
* IMPORTANT:
* This module validates configuration only. It does not create orders,
* verify payment signatures, process webhooks, or confirm settlements.
    */

const { env } = require(’./env’);

const SUPPORTED_PROVIDERS = [
‘razorpay’,
‘cashfree’,
‘stripe’,
];

const SUPPORTED_CURRENCIES = new Set([
‘INR’,
‘USD’,
‘EUR’,
‘GBP’,
‘AUD’,
‘CAD’,
‘SGD’,
]);

const SUPPORTED_MODES = new Set([
‘test’,
‘live’,
]);

function isPresent(value) {
return typeof value === ‘string’ && value.trim().length > 0;
}

function requireValue(value, name) {
if (!isPresent(value)) {
throw new Error(${name} is required for the enabled payment provider.);
}

return value.trim();
}

function getPaymentConfig() {
const currency = String(env.PAYMENT_CURRENCY || ‘INR’)
.trim()
.toUpperCase();

const mode = String(env.PAYMENT_MODE || ‘test’)
.trim()
.toLowerCase();

const config = {
enabled: env.PAYMENTS_ENABLED === true,
mode,
currency,

razorpay: {
  enabled: env.RAZORPAY_ENABLED === true,
  keyId: env.RAZORPAY_KEY_ID || '',
  keySecret: env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '',
},
cashfree: {
  enabled: env.CASHFREE_ENABLED === true,
  appId: env.CASHFREE_APP_ID || '',
  secretKey: env.CASHFREE_SECRET_KEY || '',
  webhookSecret: env.CASHFREE_WEBHOOK_SECRET || '',
},
stripe: {
  enabled: env.STRIPE_ENABLED === true,
  secretKey: env.STRIPE_SECRET_KEY || '',
  webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
},

};

return deepFreeze(config);
}

function deepFreeze(value) {
if (
value &&
typeof value === ‘object’ &&
!Object.isFrozen(value)
) {
Object.freeze(value);

for (const child of Object.values(value)) {
  deepFreeze(child);
}

}

return value;
}

function validatePaymentConfiguration() {
const config = getPaymentConfig();

if (!config.enabled) {
return true;
}

if (!SUPPORTED_MODES.has(config.mode)) {
throw new Error(
PAYMENT_MODE must be one of: ${[...SUPPORTED_MODES].join(', ')}.
);
}

if (!SUPPORTED_CURRENCIES.has(config.currency)) {
throw new Error(
Unsupported PAYMENT_CURRENCY "${config.currency}".
);
}

const enabledProviders = SUPPORTED_PROVIDERS.filter(
(provider) => config[provider].enabled
);

if (enabledProviders.length !== 1) {
throw new Error(
‘Enable exactly one payment provider when PAYMENTS_ENABLED=true.’
);
}

if (
config.mode === ‘live’ &&
config.currency === ‘INR’ &&
config.stripe.enabled
) {
// Provider availability and supported currency combinations can change.
// Confirm the account’s current Stripe capabilities before deployment.
}

validateProviderCredentials(config, enabledProviders[0]);

return true;
}

function validateProviderCredentials(config, provider) {
switch (provider) {
case ‘razorpay’: {
const payment = config.razorpay;

  requireValue(payment.keyId, 'RAZORPAY_KEY_ID');
  requireValue(payment.keySecret, 'RAZORPAY_KEY_SECRET');
  requireValue(payment.webhookSecret, 'RAZORPAY_WEBHOOK_SECRET');
  validateModeConsistency(
    payment.keyId,
    config.mode,
    'RAZORPAY_KEY_ID'
  );
  break;
}
case 'cashfree': {
  const payment = config.cashfree;
  requireValue(payment.appId, 'CASHFREE_APP_ID');
  requireValue(payment.secretKey, 'CASHFREE_SECRET_KEY');
  requireValue(payment.webhookSecret, 'CASHFREE_WEBHOOK_SECRET');
  break;
}
case 'stripe': {
  const payment = config.stripe;
  requireValue(payment.secretKey, 'STRIPE_SECRET_KEY');
  requireValue(payment.webhookSecret, 'STRIPE_WEBHOOK_SECRET');
  validateModeConsistency(
    payment.secretKey,
    config.mode,
    'STRIPE_SECRET_KEY'
  );
  break;
}
default:
  throw new Error('Unsupported payment provider.');

}
}

function validateModeConsistency(secret, mode, variableName) {
// These prefixes are provider conventions, not a substitute for validating
// credentials with the provider. Avoid assuming prefixes for other providers.
if (variableName === ‘STRIPE_SECRET_KEY’) {
if (mode === ‘live’ && !secret.startsWith(‘sk_live_’)) {
throw new Error(
‘PAYMENT_MODE=live requires a live Stripe secret key.’
);
}

if (mode === 'test' && !secret.startsWith('sk_test_')) {
  throw new Error(
    'PAYMENT_MODE=test requires a test Stripe secret key.'
  );
}

}

if (variableName === ‘RAZORPAY_KEY_ID’) {
if (mode === ‘live’ && !secret.startsWith(‘rzp_live_’)) {
throw new Error(
‘PAYMENT_MODE=live requires a live Razorpay key ID.’
);
}

if (mode === 'test' && !secret.startsWith('rzp_test_')) {
  throw new Error(
    'PAYMENT_MODE=test requires a test Razorpay key ID.'
  );
}

}
}

module.exports = {
getPaymentConfig,
validatePaymentConfiguration,
};
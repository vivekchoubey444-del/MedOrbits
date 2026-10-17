'use strict';

/**

* MedOrbits -- Stripe Payment Provider
* File: src/integrations/payment/stripe.provider.js
* Implements:
* ●	createCheckout()
* ●	fetchPayment()
* ●	verifyWebhook()
* Security:
* ●	Stripe secret keys remain server-side.
* ●	Webhooks must use the original raw request bytes.
* ●	Checkout redirects are restricted to HTTPS URLs.
* ●	Payment completion must be verified before fulfillment.
        */

const { PaymentProvider } = require('./payment.provider');
const { loadPaymentConfig } = require('./payment.config');
const { verifyStripeWebhook } = require('./webhook-verifier');

const SUPPORTED_CURRENCIES = new Set([
'inr',
'usd',
'eur',
'gbp',
'aud',
'cad',
'sgd',
]);

const MAX_METADATA_ENTRIES = 50;
const MAX_METADATA_KEY_LENGTH = 40;
const MAX_METADATA_VALUE_LENGTH = 500;
const MAX_URL_LENGTH = 2048;

function normalizeCurrency(currency) {
if (typeof currency !== 'string') {
throw new TypeError('Currency must be a string.');
}

const normalized = currency.trim().toLowerCase();

if (!SUPPORTED_CURRENCIES.has(normalized)) {
throw new TypeError('Unsupported Stripe currency.');
}

return normalized;
}

function validateAmount(amount) {
if (!Number.isSafeInteger(amount) || amount <= 0) {
throw new TypeError(
'Amount must be a positive integer in the smallest currency unit.'
);
}

return amount;
}

function validateHttpsUrl(value, fieldName) {
if (
typeof value !== 'string' ||
value.length > MAX_URL_LENGTH
) {
throw new TypeError(${fieldName} must be a valid HTTPS URL.);
}

let parsed;

try {
parsed = new URL(value);
} catch {
throw new TypeError(${fieldName} must be a valid HTTPS URL.);
}

if (
parsed.protocol !== 'https:' ||
!parsed.hostname ||
parsed.username ||
parsed.password
) {
throw new TypeError(
${fieldName} must use HTTPS and cannot contain URL credentials.
);
}

return parsed.toString();
}

function validateMetadata(metadata = {}) {
if (
!metadata ||
typeof metadata !== 'object' ||
Array.isArray(metadata)
) {
throw new TypeError('Metadata must be an object.');
}

const entries = Object.entries(metadata);

if (entries.length > MAX_METADATA_ENTRIES) {
throw new RangeError('Too many Stripe metadata fields.');
}

const result = Object.create(null);

for (const [key, value] of entries) {
if (
!key ||
key.length > MAX_METADATA_KEY_LENGTH ||
typeof value !== 'string' ||
value.length > MAX_METADATA_VALUE_LENGTH
) {
throw new TypeError(
'Metadata keys and values must be valid strings within Stripe limits.'
);
}

result[key] = value;

}

return result;
}

function validateSessionId(sessionId) {
if (
typeof sessionId !== 'string' ||
!/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)
) {
throw new TypeError('Invalid Stripe Checkout Session ID.');
}

return sessionId;
}

class StripeProvider extends PaymentProvider {
constructor({
client,
webhookSecret,
currency = 'inr',
} = {}) {
super();

if (
  !client ||
  !client.checkout ||
  !client.checkout.sessions ||
  typeof client.checkout.sessions.create !== 'function' ||
  typeof client.checkout.sessions.retrieve !== 'function'
) {
  throw new TypeError('A valid Stripe client is required.');
}
if (
  typeof webhookSecret !== 'string' ||
  !webhookSecret.trim()
) {
  throw new TypeError('Stripe webhook secret is required.');
}
this.client = client;
this.webhookSecret = webhookSecret;
this.currency = normalizeCurrency(currency);

}

static fromEnv(environment = process.env) {
const config = loadPaymentConfig({
…environment,
PAYMENT_PROVIDER: 'stripe',
});

const credentials = config.stripe;
if (!credentials.secretKey) {
  throw new Error('STRIPE_SECRET_KEY is required.');
}
if (!credentials.webhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET is required.');
}
let Stripe;
try {
  Stripe = require('stripe');
} catch {
  throw new Error(
    'Stripe integration requires the stripe package.'
  );
}
return new StripeProvider({
  client: new Stripe(credentials.secretKey),
  webhookSecret: credentials.webhookSecret,
  currency: config.currency,
});

}

async createCheckout({
amount,
currency = this.currency,
successUrl,
cancelUrl,
metadata = {},
} = {}) {
const validatedAmount = validateAmount(amount);
const validatedCurrency = normalizeCurrency(currency);

const validatedSuccessUrl = validateHttpsUrl(
  successUrl,
  'successUrl'
);
const validatedCancelUrl = validateHttpsUrl(
  cancelUrl,
  'cancelUrl'
);
const validatedMetadata = validateMetadata(metadata);
const session = await this.client.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [
    {
      price_data: {
        currency: validatedCurrency,
        unit_amount: validatedAmount,
        product_data: {
          name: 'MedOrbits service',
        },
      },
      quantity: 1,
    },
  ],
  success_url: validatedSuccessUrl,
  cancel_url: validatedCancelUrl,
  metadata: validatedMetadata,
});
if (
  !session ||
  typeof session.id !== 'string' ||
  !session.id.startsWith('cs_')
) {
  throw new Error(
    'Stripe returned an invalid Checkout Session response.'
  );
}
if (
  typeof session.url !== 'string' ||
  !session.url
) {
  throw new Error(
    'Stripe did not return a Checkout URL.'
  );
}
return {
  provider: 'stripe',
  sessionId: session.id,
  checkoutUrl: session.url,
  paymentStatus: session.payment_status || 'unpaid',
};

}

async fetchPayment(sessionId) {
const validatedId = validateSessionId(sessionId);

const session =
  await this.client.checkout.sessions.retrieve(validatedId);
if (!session || session.id !== validatedId) {
  throw new Error(
    'Stripe returned an invalid Checkout Session response.'
  );
}
return {
  id: session.id,
  paymentIntent:
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null,
  amount: session.amount_total,
  currency: session.currency,
  status: session.payment_status,
};

}

async verifyWebhook(rawBody, headers) {
if (
!Buffer.isBuffer(rawBody) &&
!(rawBody instanceof Uint8Array)
) {
throw new TypeError(
'Stripe webhook verification requires the original raw request bytes.'
);
}

if (!headers || typeof headers !== 'object') {
  throw new TypeError('Webhook headers are required.');
}
const signature =
  headers['stripe-signature'] ||
  headers['Stripe-Signature'];
if (
  typeof signature !== 'string' ||
  !signature.trim()
) {
  return false;
}
return verifyStripeWebhook(
  Buffer.from(rawBody),
  signature,
  this.webhookSecret,
  this.client
);

}
}

module.exports = {
StripeProvider,
};
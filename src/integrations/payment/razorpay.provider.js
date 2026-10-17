'use strict';

/**

* MedOrbits -- Razorpay Payment Provider
* File: src/integrations/payment/razorpay.provider.js
* Implements:
* ●	createCheckout()
* ●	fetchPayment()
* ●	verifyWebhook()
* Security:
* ●	Keep Razorpay credentials server-side.
* ●	Verify webhooks using the original raw request bytes.
* ●	Never treat checkout creation as proof of payment.
        */

const { PaymentProvider } = require('./payment.provider');
const { loadPaymentConfig } = require('./payment.config');
const { verifyRazorpayWebhook } = require('./webhook-verifier');

const SUPPORTED_CURRENCIES = new Set([
'INR',
'USD',
'EUR',
'GBP',
'AUD',
'CAD',
'SGD',
]);

const MAX_RECEIPT_LENGTH = 40;
const MAX_NOTES_COUNT = 15;
const MAX_NOTE_KEY_LENGTH = 256;
const MAX_NOTE_VALUE_LENGTH = 256;

function normalizeCurrency(currency) {
if (typeof currency !== 'string') {
throw new TypeError('Currency must be a string.');
}

const normalized = currency.trim().toUpperCase();

if (!SUPPORTED_CURRENCIES.has(normalized)) {
throw new TypeError('Unsupported payment currency.');
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

function validateReceipt(receipt) {
if (
typeof receipt !== 'string' ||
!receipt.trim() ||
receipt.length > MAX_RECEIPT_LENGTH ||
!/^[a-zA-Z0-9_-]+$/.test(receipt)
) {
throw new TypeError(
'Receipt must contain 1–40 alphanumeric characters, underscores, or hyphens.'
);
}

return receipt;
}

function validateNotes(notes = {}) {
if (
!notes ||
typeof notes !== 'object' ||
Array.isArray(notes)
) {
throw new TypeError('Notes must be an object.');
}

const entries = Object.entries(notes);

if (entries.length > MAX_NOTES_COUNT) {
throw new RangeError('Too many checkout note fields.');
}

const result = {};

for (const [key, value] of entries) {
if (
!key ||
key.length > MAX_NOTE_KEY_LENGTH ||
typeof value !== 'string' ||
value.length > MAX_NOTE_VALUE_LENGTH
) {
throw new TypeError('Invalid checkout note.');
}

result[key] = value;

}

return result;
}

function validatePaymentId(paymentId) {
if (
typeof paymentId !== 'string' ||
!/^pay_[a-zA-Z0-9]+$/.test(paymentId)
) {
throw new TypeError('Invalid Razorpay payment ID.');
}

return paymentId;
}

class RazorpayProvider extends PaymentProvider {
constructor({
client,
keyId,
webhookSecret,
currency = 'INR',
} = {}) {
super();

if (
  !client ||
  !client.orders ||
  typeof client.orders.create !== 'function' ||
  !client.payments ||
  typeof client.payments.fetch !== 'function'
) {
  throw new TypeError('A valid Razorpay client is required.');
}
if (typeof keyId !== 'string' || !keyId.trim()) {
  throw new TypeError('Razorpay key ID is required.');
}
if (
  typeof webhookSecret !== 'string' ||
  !webhookSecret.trim()
) {
  throw new TypeError('Razorpay webhook secret is required.');
}
this.client = client;
this.keyId = keyId.trim();
this.webhookSecret = webhookSecret;
this.currency = normalizeCurrency(currency);

}

static fromEnv(environment = process.env) {
const config = loadPaymentConfig({
…environment,
PAYMENT_PROVIDER: 'razorpay',
});

const credentials = config.razorpay;
let Razorpay;
try {
  Razorpay = require('razorpay');
} catch {
  throw new Error(
    'Razorpay integration requires the razorpay package.'
  );
}
if (!credentials.keyId || !credentials.keySecret) {
  throw new Error('Razorpay credentials are required.');
}
if (!credentials.webhookSecret) {
  throw new Error('Razorpay webhook secret is required.');
}
return new RazorpayProvider({
  client: new Razorpay({
    key_id: credentials.keyId,
    key_secret: credentials.keySecret,
  }),
  keyId: credentials.keyId,
  webhookSecret: credentials.webhookSecret,
  currency: config.currency,
});

}

async createCheckout({
amount,
currency = this.currency,
receipt,
notes = {},
} = {}) {
const validatedAmount = validateAmount(amount);
const validatedCurrency = normalizeCurrency(currency);
const validatedReceipt = validateReceipt(receipt);
const validatedNotes = validateNotes(notes);

const order = await this.client.orders.create({
  amount: validatedAmount,
  currency: validatedCurrency,
  receipt: validatedReceipt,
  notes: validatedNotes,
});
if (
  !order ||
  typeof order.id !== 'string' ||
  !order.id.startsWith('order_')
) {
  throw new Error('Razorpay returned an invalid order response.');
}
return {
  provider: 'razorpay',
  orderId: order.id,
  amount: order.amount,
  currency: order.currency,
  keyId: this.keyId,
};

}

async fetchPayment(paymentId) {
const validatedId = validatePaymentId(paymentId);
const payment = await this.client.payments.fetch(validatedId);

if (!payment || payment.id !== validatedId) {
  throw new Error('Razorpay returned an invalid payment response.');
}
return {
  id: payment.id,
  orderId: payment.order_id || null,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
};

}

async verifyWebhook(rawBody, headers) {
if (
!Buffer.isBuffer(rawBody) &&
!(rawBody instanceof Uint8Array)
) {
throw new TypeError(
'Webhook verification requires the original raw request bytes.'
);
}

if (!headers || typeof headers !== 'object') {
  throw new TypeError('Webhook headers are required.');
}
const signature =
  headers['x-razorpay-signature'] ||
  headers['X-Razorpay-Signature'];
if (
  typeof signature !== 'string' ||
  !signature.trim()
) {
  return false;
}
return verifyRazorpayWebhook(
  Buffer.from(rawBody),
  signature,
  this.webhookSecret
);

}
}

module.exports = {
RazorpayProvider,
};
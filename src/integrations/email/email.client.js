'use strict';

/**

* MedOrbits -- Email Client
* File: src/integrations/email/email.client.js
* Responsibilities:
* ●	Validate outgoing email messages.
* ●	Reject malformed addresses and unsafe headers.
* ●	Normalize recipient fields.
* ●	Delegate delivery to the configured email provider.
* ●	Support graceful provider shutdown.
* This module does not implement SMTP transport, templates,
* retries, delivery tracking, or email queue processing.
    */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_ADDRESS_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 998;
const MAX_RECIPIENTS = 100;
const MAX_BODY_LENGTH = 5 * 1024 * 1024;

function isEmail(value) {
return (
typeof value === 'string' &&
value.length > 0 &&
value.length <= MAX_ADDRESS_LENGTH &&
EMAIL_PATTERN.test(value)
);
}

function normalizeAddressList(value, fieldName, options = {}) {
if (value == null && options.optional) {
return undefined;
}

const addresses = Array.isArray(value) ? value : [value];

if (
addresses.length === 0 ||
addresses.length > MAX_RECIPIENTS ||
addresses.some(address => !isEmail(address))
) {
throw new TypeError(`Invalid ${fieldName} email address list.`);
}

return [...addresses];
}

function validateHeaderValue(value, fieldName, maxLength) {
if (
typeof value !== 'string' ||
!value.trim() ||
value.length > maxLength ||
/[\r\n\0]/.test(value)
) {
throw new TypeError(`Invalid email ${fieldName}.`);
}

return value.trim();
}

function validateBody(value, fieldName) {
if (
typeof value !== 'string' ||
value.length > MAX_BODY_LENGTH
) {
throw new TypeError(
`Email ${fieldName} must be a string within the configured size limit.`
);
}

return value;
}

function validateMessage(message) {
if (
!message ||
typeof message !== 'object' ||
Array.isArray(message)
) {
throw new TypeError('Email message is required.');
}

const to = normalizeAddressList(message.to, 'recipient');

const subject = validateHeaderValue(
message.subject,
'subject',
MAX_SUBJECT_LENGTH
);

const hasHtml = message.html != null;
const hasText = message.text != null;

if (!hasHtml && !hasText) {
throw new TypeError(
'At least one email body field (html or text) is required.'
);
}

const result = {
...message,
to,
subject,
};

if (hasHtml) {
result.html = validateBody(message.html, 'HTML body');
}

if (hasText) {
result.text = validateBody(message.text, 'text body');
}

for (const field of ['cc', 'bcc', 'replyTo']) {
if (message[field] != null) {
result[field] = normalizeAddressList(
message[field],
field,
{ optional: true }
);
}
}

if (message.from != null) {
result.from = validateHeaderValue(
message.from,
'sender',
MAX_ADDRESS_LENGTH
);

if (!isEmail(result.from)) {
  throw new TypeError('Invalid sender email address.');
}

}

if (message.headers != null) {
if (
typeof message.headers !== 'object' ||
Array.isArray(message.headers)
) {
throw new TypeError('Email headers must be an object.');
}

for (const [name, value] of Object.entries(message.headers)) {
  if (
    !/^[a-zA-Z0-9-]+$/.test(name) ||
    typeof value !== 'string' ||
    /[\r\n\0]/.test(value)
  ) {
    throw new TypeError('Invalid custom email header.');
  }
}

}

return result;
}

class EmailClient {
#provider;
#closed = false;

constructor(provider) {
if (!provider || typeof provider.send !== 'function') {
throw new TypeError('A valid email provider is required.');
}

Object.defineProperty(this, '#provider', {
  value: provider,
  enumerable: false,
  configurable: false,
  writable: false,
});
this.#provider = provider;

}

async send(message) {
if (this.#closed) {
throw new Error('Email client is closed.');
}

const validatedMessage = validateMessage(message);
return this.#provider.send(validatedMessage);

}

async close() {
if (this.#closed) {
return;
}

this.#closed = true;
if (typeof this.#provider.close === 'function') {
  await this.#provider.close();
}

}
}

module.exports = {
EmailClient,
validateMessage,
isEmail,
};
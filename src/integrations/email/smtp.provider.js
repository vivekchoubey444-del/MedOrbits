'use strict';

/**

* MedOrbits -- SMTP Email Provider
* File: src/integrations/email/smtp.provider.js
* Requires:
* npm install nodemailer
* Environment variables:
* SMTP_HOST
* SMTP_PORT
* SMTP_USER
* SMTP_PASS
* SMTP_SECURE
* SMTP_CONNECTION_TIMEOUT_MS
* SMTP_GREETING_TIMEOUT_MS
* SMTP_SOCKET_TIMEOUT_MS
* EMAIL_FROM
    */

const { EmailProvider } = require('./email.provider');

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_GREETING_TIMEOUT_MS = 10_000;
const DEFAULT_SOCKET_TIMEOUT_MS = 20_000;
const MAX_RECIPIENTS = 100;

function requiredString(value, name) {
if (typeof value !== 'string' || !value.trim()) {
throw new Error(`${name} is required.`);
}

return value.trim();
}

function positiveInteger(value, name, fallback, max = 120_000) {
if (value == null || value === '') {
return fallback;
}

const number = Number(value);

if (
!Number.isSafeInteger(number) ||
number < 1 ||
number > max
) {
throw new Error(`${name} must be an integer between 1 and ${max}.`);
}

return number;
}

function parseBoolean(value, name, fallback) {
if (value == null || value === '') {
return fallback;
}

if (typeof value === 'boolean') {
return value;
}

if (typeof value !== 'string') {
throw new Error(`${name} must be true or false.`);
}

const normalized = value.trim().toLowerCase();

if (normalized === 'true') return true;
if (normalized === 'false') return false;

throw new Error(`${name} must be true or false.`);
}

function validateEmailAddress(value, name) {
if (
typeof value !== 'string' ||
value.length > 254 ||
/[\r\n\0]/.test(value) ||
!/^[^\s@<>(),;:"[\]]+@[^\s@<>(),;:"[\]]+\.[^\s@<>(),;:"[\]]+$/.test(value)
) {
throw new TypeError(`${name} must be a valid email address.`);
}

return value;
}

function validateRecipientList(value, name) {
const addresses = Array.isArray(value) ? value : [value];

if (
addresses.length === 0 ||
addresses.length > MAX_RECIPIENTS ||
addresses.some(address => typeof address !== 'string' || !address.trim())
) {
throw new TypeError(`Invalid ${name} recipient list.`);
}

return addresses;
}

class SmtpProvider extends EmailProvider {
constructor({
transporter,
from,
secure = true,
maxRecipients = MAX_RECIPIENTS,
} = {}) {
super();

if (
  !transporter ||
  typeof transporter.sendMail !== 'function' ||
  typeof transporter.close !== 'function'
) {
  throw new TypeError(
    'A valid Nodemailer transporter is required.'
  );
}
this.transporter = transporter;
this.from = validateEmailAddress(from, 'EMAIL_FROM');
this.secure = Boolean(secure);
this.maxRecipients = maxRecipients;
this.closed = false;
this.closePromise = null;

}

static fromEnv(env = process.env) {
if (!env || typeof env !== 'object') {
throw new TypeError('SMTP environment configuration is required.');
}

const host = requiredString(env.SMTP_HOST, 'SMTP_HOST');
const user = requiredString(env.SMTP_USER, 'SMTP_USER');
const pass = requiredString(env.SMTP_PASS, 'SMTP_PASS');
const from = validateEmailAddress(
  requiredString(env.EMAIL_FROM, 'EMAIL_FROM'),
  'EMAIL_FROM'
);
const port = Number(env.SMTP_PORT);
if (
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535
) {
  throw new Error('SMTP_PORT must be an integer between 1 and 65535.');
}
const secure = parseBoolean(
  env.SMTP_SECURE,
  'SMTP_SECURE',
  port === 465
);
if (port === 465 && !secure) {
  throw new Error('SMTP port 465 requires SMTP_SECURE=true.');
}
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch {
  throw new Error(
    'SMTP integration requires the nodemailer package.'
  );
}
const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  connectionTimeout: positiveInteger(
    env.SMTP_CONNECTION_TIMEOUT_MS,
    'SMTP_CONNECTION_TIMEOUT_MS',
    DEFAULT_CONNECTION_TIMEOUT_MS
  ),
  greetingTimeout: positiveInteger(
    env.SMTP_GREETING_TIMEOUT_MS,
    'SMTP_GREETING_TIMEOUT_MS',
    DEFAULT_GREETING_TIMEOUT_MS
  ),
  socketTimeout: positiveInteger(
    env.SMTP_SOCKET_TIMEOUT_MS,
    'SMTP_SOCKET_TIMEOUT_MS',
    DEFAULT_SOCKET_TIMEOUT_MS
  ),
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});
return new SmtpProvider({
  transporter,
  from,
  secure,
});

}

async send(message) {
if (this.closed) {
throw new Error('SMTP provider is closed.');
}

if (!message || typeof message !== 'object') {
  throw new TypeError('A validated email message is required.');
}
const to = validateRecipientList(message.to, 'to');
for (const address of [
  ...(message.cc == null ? [] : validateRecipientList(message.cc, 'cc')),
  ...(message.bcc == null ? [] : validateRecipientList(message.bcc, 'bcc')),
  ...(message.replyTo == null ? [] : validateRecipientList(message.replyTo, 'replyTo')),
]) {
  validateEmailAddress(address, 'Recipient');
}
const recipientCount =
  to.length +
  (message.cc == null ? 0 : message.cc.length) +
  (message.bcc == null ? 0 : message.bcc.length);
if (recipientCount > this.maxRecipients) {
  throw new RangeError('Email recipient limit exceeded.');
}
if (
  typeof message.subject !== 'string' ||
  !message.subject.trim() ||
  /[\r\n\0]/.test(message.subject)
) {
  throw new TypeError('A valid email subject is required.');
}
if (message.text == null && message.html == null) {
  throw new TypeError('Email text or HTML content is required.');
}
const mail = {
  from: this.from,
  to,
  subject: message.subject,
};
for (const field of ['cc', 'bcc', 'replyTo', 'text', 'html', 'headers']) {
  if (message[field] != null) {
    mail[field] = message[field];
  }
}
const result = await this.transporter.sendMail(mail);
return {
  messageId: result.messageId || null,
  accepted: Array.isArray(result.accepted) ? result.accepted : [],
  rejected: Array.isArray(result.rejected) ? result.rejected : [],
};

}

async close() {
if (this.closePromise) {
return this.closePromise;
}

this.closed = true;
this.closePromise = Promise.resolve().then(() => {
  this.transporter.close();
});
return this.closePromise;

}
}

module.exports = {
SmtpProvider,
};
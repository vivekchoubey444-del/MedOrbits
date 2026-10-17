'use strict';

/**

* MedOrbits -- Email Service
* File: src/config/email.js
* Responsibilities:
* ●	Configure and reuse the SMTP transporter.
* ●	Validate outgoing email messages.
* ●	Send text and/or HTML email.
* ●	Verify SMTP transport connectivity.
* ●	Log delivery submission metadata without exposing message content.
* Required when EMAIL_ENABLED=true:
* ●	SMTP_HOST
* ●	SMTP_PORT
* ●	SMTP_USER
* ●	SMTP_PASSWORD
* ●	EMAIL_FROM_ADDRESS
* The env module is expected to validate and normalize configuration values.
    */

const nodemailer = require('nodemailer');
const { env } = require('./env');
const logger = require('./logger');

let transporter;
let transporterConfigKey;

const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+.[^\s@]+$/;

function isNonEmptyString(value) {
return typeof value === 'string' && value.trim().length > 0;
}

function validateEmailAddress(value, fieldName) {
if (
typeof value !== 'string' ||
value.length > 254 ||
!EMAIL_ADDRESS_PATTERN.test(value.trim())
) {
throw new TypeError(`${fieldName} must be a valid email address.`);
}

return value.trim();
}

function normalizeRecipients(value, fieldName = 'to') {
const recipients = Array.isArray(value) ? value : [value];

if (recipients.length === 0) {
throw new TypeError(`${fieldName} must contain at least one recipient.`);
}

return recipients.map((recipient) =>
validateEmailAddress(recipient, fieldName)
);
}

function validateMessage({ to, subject, text, html }) {
const recipients = normalizeRecipients(to);

if (!isNonEmptyString(subject)) {
throw new TypeError('Email subject must be a non-empty string.');
}

if (subject.length > 998) {
throw new TypeError('Email subject exceeds the permitted length.');
}

if (
(!isNonEmptyString(text) && !isNonEmptyString(html)) ||
(text !== undefined && typeof text !== 'string') ||
(html !== undefined && typeof html !== 'string')
) {
throw new TypeError(
'Email requires non-empty text or HTML string content.'
);
}

return { recipients };
}

function getTransportConfig() {
if (!env.EMAIL_ENABLED) {
throw new Error(
'Email is disabled. Set EMAIL_ENABLED=true to enable it.'
);
}

const required = [
['SMTP_HOST', env.SMTP_HOST],
['SMTP_USER', env.SMTP_USER],
['SMTP_PASSWORD', env.SMTP_PASSWORD],
['EMAIL_FROM_ADDRESS', env.EMAIL_FROM_ADDRESS],
];

const missing = required
.filter(([, value]) => !isNonEmptyString(value))
.map(([name]) => name);

if (missing.length > 0) {
throw new Error(
`Email configuration is incomplete. Missing: ${missing.join(', ')}.`
);
}

const port = Number(env.SMTP_PORT);
const timeout = Number(env.EMAIL_SEND_TIMEOUT_MS);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
throw new Error('SMTP_PORT must be an integer between 1 and 65535.');
}

if (!Number.isSafeInteger(timeout) || timeout <= 0) {
throw new Error('EMAIL_SEND_TIMEOUT_MS must be a positive integer.');
}

if (typeof env.SMTP_SECURE !== 'boolean') {
throw new Error('SMTP_SECURE must be a boolean.');
}

if (
env.SMTP_SECURE &&
port === 587
) {
logger.warn(
{ port },
'SMTP_SECURE=true on port 587; confirm the provider expects implicit TLS.'
);
}

const fromAddress = validateEmailAddress(
env.EMAIL_FROM_ADDRESS,
'EMAIL_FROM_ADDRESS'
);

const replyTo = isNonEmptyString(env.EMAIL_REPLY_TO)
? validateEmailAddress(env.EMAIL_REPLY_TO, 'EMAIL_REPLY_TO')
: undefined;

const fromName = isNonEmptyString(env.EMAIL_FROM_NAME)
? env.EMAIL_FROM_NAME.trim()
: 'MedOrbits';

return {
host: env.SMTP_HOST.trim(),
port,
secure: env.SMTP_SECURE,
auth: {
user: env.SMTP_USER,
pass: env.SMTP_PASSWORD,
},
connectionTimeout: timeout,
greetingTimeout: timeout,
socketTimeout: timeout,
pool: true,
maxConnections: 5,
maxMessages: 100,
from: {
name: fromName,
address: fromAddress,
},
replyTo,
};
}

function getEmailTransporter() {
const config = getTransportConfig();

// Recreate the transporter if its effective configuration changes.
const configKey = JSON.stringify({
host: config.host,
port: config.port,
secure: config.secure,
user: config.auth.user,
from: config.from,
timeout: config.socketTimeout,
});

if (transporter && transporterConfigKey === configKey) {
return transporter;
}

if (transporter) {
transporter.close();
transporter = undefined;
transporterConfigKey = undefined;
}

transporter = nodemailer.createTransport({
host: config.host,
port: config.port,
secure: config.secure,
auth: config.auth,
connectionTimeout: config.connectionTimeout,
greetingTimeout: config.greetingTimeout,
socketTimeout: config.socketTimeout,
pool: config.pool,
maxConnections: config.maxConnections,
maxMessages: config.maxMessages,
});

transporterConfigKey = configKey;

return transporter;
}

async function sendEmail({
to,
subject,
text,
html,
replyTo,
}) {
const { recipients } = validateMessage({
to,
subject,
text,
html,
});

const config = getTransportConfig();

const validatedReplyTo = isNonEmptyString(replyTo)
? validateEmailAddress(replyTo, 'replyTo')
: config.replyTo;

const transport = getEmailTransporter();

try {
const info = await transport.sendMail({
from: config.from,
replyTo: validatedReplyTo,
to: recipients,
subject: subject.trim(),
...(isNonEmptyString(text) ? { text } : {}),
...(isNonEmptyString(html) ? { html } : {}),
});

logger.info(
  {
    messageId: info.messageId,
    acceptedCount: Array.isArray(info.accepted)
      ? info.accepted.length
      : 0,
    rejectedCount: Array.isArray(info.rejected)
      ? info.rejected.length
      : 0,
  },
  'Email submission completed'
);
if (
  Array.isArray(info.rejected) &&
  info.rejected.length > 0
) {
  logger.warn(
    {
      rejectedCount: info.rejected.length,
    },
    'SMTP transport rejected one or more recipients'
  );
}
return info;

} catch (error) {
logger.error(
{
code: error.code,
command: error.command,
responseCode: error.responseCode,
},
'Email submission failed'
);

throw error;

}
}

async function verifyEmailTransport() {
const transport = getEmailTransporter();

try {
await transport.verify();

logger.info('SMTP transport verification succeeded');
return { ok: true };

} catch (error) {
logger.error(
{
code: error.code,
command: error.command,
responseCode: error.responseCode,
},
'SMTP transport verification failed'
);

throw error;

}
}

function closeEmailTransport() {
if (!transporter) {
return;
}

const currentTransporter = transporter;

transporter = undefined;
transporterConfigKey = undefined;

currentTransporter.close();
}

module.exports = {
sendEmail,
verifyEmailTransport,
getEmailTransporter,
closeEmailTransport,
};
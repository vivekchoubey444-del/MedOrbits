  'use strict';

/**

* MedOrbits -- Email Integration Entry Point
* File: src/integrations/email/index.js
* Exposes the email client, provider contract, SMTP adapter,
* and a factory for creating configured email clients.
    */

const { EmailClient } = require('./email.client');
const { EmailProvider } = require('./email.provider');
const { SmtpProvider } = require('./smtp.provider');

function validateProvider(provider) {
if (
!provider ||
typeof provider.send !== 'function'
) {
throw new TypeError(
'Email provider must implement send(message).'
);
}

if (
provider.close != null &&
typeof provider.close !== 'function'
) {
throw new TypeError(
'Email provider close must be a function when provided.'
);
}

return provider;
}

function createEmailClient(options = {}) {
if (
!options ||
typeof options !== 'object' ||
Array.isArray(options)
) {
throw new TypeError(
'Email client options must be an object.'
);
}

const provider = options.provider
? validateProvider(options.provider)
: SmtpProvider.fromEnv(options.env || process.env);

return new EmailClient(provider);
}

module.exports = {
createEmailClient,
EmailClient,
EmailProvider,
SmtpProvider,
};
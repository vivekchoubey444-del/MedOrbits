'use strict';

const crypto = require('node:crypto');

const HEX_SIGNATURE_PATTERN = /^[a-f0-9]+$/i;

/**

* Safely compare two hexadecimal signatures using a constant-time
* comparison when their decoded byte lengths match.
    */
    function safeEqualHex(expected, received) {
    if (
    typeof expected !== 'string' ||
    typeof received !== 'string' ||
    !HEX_SIGNATURE_PATTERN.test(expected) ||
    !HEX_SIGNATURE_PATTERN.test(received) ||
    expected.length % 2 !== 0 ||
    received.length % 2 !== 0
    ) {
    return false;
    }

const expectedBuffer = Buffer.from(expected, 'hex');
const receivedBuffer = Buffer.from(received, 'hex');

if (
expectedBuffer.length === 0 ||
expectedBuffer.length !== receivedBuffer.length
) {
return false;
}

return crypto.timingSafeEqual(
expectedBuffer,
receivedBuffer
);
}

/**

* Verify an HMAC-SHA256 webhook signature.
* The body must be the exact raw request bytes, not JSON.stringify()
* output or an already-parsed request body.
    */
    function verifyHmacSha256(rawBody, signature, secret) {
    if (!Buffer.isBuffer(rawBody)) {
    throw new TypeError(
    'rawBody must be the exact raw request Buffer.'
    );
    }

if (
typeof secret !== 'string' ||
secret.length === 0
) {
throw new Error('Webhook secret is required.');
}

if (
typeof signature !== 'string' ||
signature.length === 0 ||
signature.length > 256 ||
!HEX_SIGNATURE_PATTERN.test(signature) ||
signature.length % 2 !== 0
) {
return false;
}

const expected = crypto
.createHmac('sha256', secret)
.update(rawBody)
.digest('hex');

return safeEqualHex(expected, signature);
}

/**

* Verify Razorpay's HMAC-SHA256 webhook signature.
    */
    function verifyRazorpayWebhook(rawBody, signature, secret) {
    return verifyHmacSha256(rawBody, signature, secret);
    }

/**

* Verify a Stripe webhook using the official Stripe SDK.
* Stripe's signature header contains a timestamp and signature
* components; it must not be treated as a plain hexadecimal HMAC.
    */
    function verifyStripeWebhook(
    rawBody,
    signature,
    secret,
    stripe
    ) {
    if (!Buffer.isBuffer(rawBody)) {
    throw new TypeError(
    'rawBody must be the exact raw request Buffer.'
    );
    }

if (
typeof secret !== 'string' ||
secret.length === 0
) {
throw new Error('Stripe webhook secret is required.');
}

if (
typeof signature !== 'string' ||
signature.length === 0
) {
return false;
}

if (
!stripe ||
!stripe.webhooks ||
typeof stripe.webhooks.constructEvent !== 'function'
) {
throw new TypeError(
'A valid Stripe SDK instance is required.'
);
}

try {
stripe.webhooks.constructEvent(
rawBody,
signature,
secret
);

return true;

} catch {
// Invalid signatures, malformed payloads, and timestamp
// tolerance failures must not authorize webhook processing.
return false;
}
}

module.exports = {
safeEqualHex,
verifyHmacSha256,
verifyRazorpayWebhook,
verifyStripeWebhook,
};
'use strict';
const crypto=require('node:crypto');
function safeEqualHex(a,b){if(typeof a!=='string'||typeof b!=='string'||!/^[a-f0-9]+$/i.test(b))return false;const x=Buffer.from(a,'hex'),y=Buffer.from(b,'hex');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y);}
function verifyHmacSha256(rawBody,signature,secret){if(!Buffer.isBuffer(rawBody))throw new TypeError('rawBody must be the exact raw request Buffer');if(!secret)throw new Error('Webhook secret required');if(typeof signature!=='string')return false;return safeEqualHex(crypto.createHmac('sha256',secret).update(rawBody).digest('hex'),signature);}
function verifyRazorpayWebhook(raw,signature,secret){return verifyHmacSha256(raw,signature,secret);}
function verifyStripeWebhook(raw,signature,secret,stripe){if(!Buffer.isBuffer(raw))throw new TypeError('rawBody must be Buffer');if(!secret)throw new Error('Stripe webhook secret required');if(!stripe?.webhooks?.constructEvent)throw new TypeError('Stripe SDK instance required');try{stripe.webhooks.constructEvent(raw,signature,secret);return true;}catch{return false;}}
module.exports={safeEqualHex,verifyHmacSha256,verifyRazorpayWebhook,verifyStripeWebhook};

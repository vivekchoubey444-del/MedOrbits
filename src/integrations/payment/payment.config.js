'use strict';
function loadPaymentConfig(env=process.env){const provider=(env.PAYMENT_PROVIDER||'').toLowerCase();if(!['razorpay','stripe'].includes(provider))throw new Error('PAYMENT_PROVIDER must be razorpay or stripe');return {provider,currency:(env.PAYMENT_CURRENCY||'INR').toUpperCase(),razorpay:{keyId:env.RAZORPAY_KEY_ID||'',keySecret:env.RAZORPAY_KEY_SECRET||'',webhookSecret:env.RAZORPAY_WEBHOOK_SECRET||''},stripe:{secretKey:env.STRIPE_SECRET_KEY||'',webhookSecret:env.STRIPE_WEBHOOK_SECRET||''}};}
module.exports={loadPaymentConfig};

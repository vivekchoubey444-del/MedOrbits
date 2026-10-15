'use strict';

const { env } = require('./env');

function getPaymentConfig() {
  return Object.freeze({
    enabled: env.PAYMENTS_ENABLED,
    mode: env.PAYMENT_MODE,
    currency: env.PAYMENT_CURRENCY.toUpperCase(),
    razorpay: Object.freeze({
      enabled: env.RAZORPAY_ENABLED,
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    }),
    cashfree: Object.freeze({
      enabled: env.CASHFREE_ENABLED,
      appId: env.CASHFREE_APP_ID,
      secretKey: env.CASHFREE_SECRET_KEY,
      webhookSecret: env.CASHFREE_WEBHOOK_SECRET,
    }),
    stripe: Object.freeze({
      enabled: env.STRIPE_ENABLED,
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    }),
  });
}

function validatePaymentConfiguration() {
  if (!env.PAYMENTS_ENABLED) return true;

  const enabledProviders = [
    env.RAZORPAY_ENABLED,
    env.CASHFREE_ENABLED,
    env.STRIPE_ENABLED,
  ].filter(Boolean).length;

  if (enabledProviders !== 1) {
    throw new Error('Enable exactly one configured payment provider when PAYMENTS_ENABLED=true.');
  }

  if (env.RAZORPAY_ENABLED && (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)) {
    throw new Error('Razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  if (env.CASHFREE_ENABLED && (!env.CASHFREE_APP_ID || !env.CASHFREE_SECRET_KEY)) {
    throw new Error('Cashfree requires CASHFREE_APP_ID and CASHFREE_SECRET_KEY.');
  }

  if (env.STRIPE_ENABLED && !env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe requires STRIPE_SECRET_KEY.');
  }

  return true;
}

module.exports = { getPaymentConfig, validatePaymentConfiguration };

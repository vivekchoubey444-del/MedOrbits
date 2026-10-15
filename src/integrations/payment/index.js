'use strict';
const {PaymentClient}=require('./payment.client');const {PaymentProvider}=require('./payment.provider');const {RazorpayProvider}=require('./razorpay.provider');const {StripeProvider}=require('./stripe.provider');const {loadPaymentConfig}=require('./payment.config');
function createPaymentClient(o={}){if(o.provider)return new PaymentClient(o.provider);const env=o.env||process.env,c=o.config||loadPaymentConfig(env);return new PaymentClient(c.provider==='razorpay'?RazorpayProvider.fromEnv(env):StripeProvider.fromEnv(env));}
module.exports={createPaymentClient,PaymentClient,PaymentProvider,RazorpayProvider,StripeProvider,loadPaymentConfig};

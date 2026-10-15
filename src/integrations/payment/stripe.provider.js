'use strict';
const {PaymentProvider}=require('./payment.provider');const {loadPaymentConfig}=require('./payment.config');const {verifyStripeWebhook}=require('./webhook-verifier');
class StripeProvider extends PaymentProvider{
 constructor({client,webhookSecret,currency='inr'}){super();if(!client)throw new TypeError('Stripe client required');Object.assign(this,{client,webhookSecret:webhookSecret||'',currency:currency.toLowerCase()});}
 static fromEnv(env=process.env){const c=loadPaymentConfig({...env,PAYMENT_PROVIDER:'stripe'}).stripe;if(!c.secretKey)throw new Error('STRIPE_SECRET_KEY required');let Stripe;try{Stripe=require('stripe');}catch{throw new Error('Install stripe');}return new StripeProvider({client:new Stripe(c.secretKey),webhookSecret:c.webhookSecret,currency:env.PAYMENT_CURRENCY||'INR'});}
 async createCheckout({amount,currency=this.currency,successUrl,cancelUrl,metadata={}}){const n=Number(amount);if(!Number.isSafeInteger(n)||n<=0)throw new TypeError('amount must be positive integer in smallest currency unit');if(!https(successUrl)||!https(cancelUrl))throw new TypeError('Success/cancel URLs must be HTTPS');const s=await this.client.checkout.sessions.create({mode:'payment',payment_method_types:['card'],line_items:[{price_data:{currency:currency.toLowerCase(),unit_amount:n,product_data:{name:'MedOrbits service'}},quantity:1}],success_url:successUrl,cancel_url:cancelUrl,metadata});return {provider:'stripe',sessionId:s.id,checkoutUrl:s.url,paymentStatus:s.payment_status};}
 async fetchPayment(id){const s=await this.client.checkout.sessions.retrieve(id);return {id:s.id,paymentIntent:s.payment_intent,amount:s.amount_total,currency:s.currency,status:s.payment_status};}
 async verifyWebhook(raw,headers){return verifyStripeWebhook(raw,headers?.['stripe-signature']||headers?.['Stripe-Signature'],this.webhookSecret,this.client);}
}
function https(v){try{return new URL(v).protocol==='https:';}catch{return false;}}
module.exports={StripeProvider};

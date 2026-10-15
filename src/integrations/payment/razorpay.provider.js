'use strict';
const {PaymentProvider}=require('./payment.provider');const {loadPaymentConfig}=require('./payment.config');const {verifyRazorpayWebhook}=require('./webhook-verifier');
class RazorpayProvider extends PaymentProvider{
 constructor({client,keyId,webhookSecret,currency='INR'}){super();if(!client||!keyId)throw new TypeError('Razorpay client and keyId required');Object.assign(this,{client,keyId,webhookSecret:webhookSecret||'',currency});}
 static fromEnv(env=process.env){const c=loadPaymentConfig({...env,PAYMENT_PROVIDER:'razorpay'}).razorpay;if(!c.keyId||!c.keySecret)throw new Error('Razorpay credentials required');let R;try{R=require('razorpay');}catch{throw new Error('Install razorpay');}return new RazorpayProvider({client:new R({key_id:c.keyId,key_secret:c.keySecret}),keyId:c.keyId,webhookSecret:c.webhookSecret,currency:env.PAYMENT_CURRENCY||'INR'});}
 async createCheckout({amount,currency=this.currency,receipt,notes={}}){const n=Number(amount);if(!Number.isSafeInteger(n)||n<=0)throw new TypeError('amount must be positive integer in smallest currency unit');if(typeof receipt!=='string'||!receipt||receipt.length>40)throw new TypeError('receipt required (max 40 chars)');const o=await this.client.orders.create({amount:n,currency,receipt,notes});return {provider:'razorpay',orderId:o.id,amount:o.amount,currency:o.currency,keyId:this.keyId};}
 async fetchPayment(id){const p=await this.client.payments.fetch(id);return {id:p.id,orderId:p.order_id,amount:p.amount,currency:p.currency,status:p.status};}
 async verifyWebhook(raw,headers){return verifyRazorpayWebhook(raw,headers?.['x-razorpay-signature']||headers?.['X-Razorpay-Signature'],this.webhookSecret);}
}
module.exports={RazorpayProvider};

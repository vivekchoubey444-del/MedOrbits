'use strict';
class PaymentProvider{async createCheckout(_r){throw new Error('createCheckout must be implemented');}async fetchPayment(_id){throw new Error('fetchPayment must be implemented');}async verifyWebhook(_raw,_headers){throw new Error('verifyWebhook must be implemented');}}
module.exports={PaymentProvider};

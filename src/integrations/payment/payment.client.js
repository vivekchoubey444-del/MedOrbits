'use strict';
class PaymentClient{constructor(provider){if(!provider||!['createCheckout','fetchPayment','verifyWebhook'].every(k=>typeof provider[k]==='function'))throw new TypeError('Payment provider interface incomplete');this.provider=provider;}createCheckout(r){return this.provider.createCheckout(r);}fetchPayment(id){return this.provider.fetchPayment(id);}verifyWebhook(raw,headers){return this.provider.verifyWebhook(raw,headers);}}
module.exports={PaymentClient};

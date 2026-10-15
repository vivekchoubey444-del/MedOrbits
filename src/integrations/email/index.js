'use strict';
const {EmailClient}=require('./email.client'); const {EmailProvider}=require('./email.provider'); const {SmtpProvider}=require('./smtp.provider');
function createEmailClient(options={}) { return new EmailClient(options.provider || SmtpProvider.fromEnv(options.env || process.env)); }
module.exports={createEmailClient,EmailClient,EmailProvider,SmtpProvider};

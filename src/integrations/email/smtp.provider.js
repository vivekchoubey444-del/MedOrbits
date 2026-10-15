'use strict';
const { EmailProvider } = require('./email.provider');
class SmtpProvider extends EmailProvider {
  constructor({transporter, from}) { super(); if (!transporter?.sendMail || !from) throw new TypeError('transporter and from are required'); this.transporter=transporter; this.from=from; }
  static fromEnv(env=process.env) {
    const keys=['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','EMAIL_FROM'];
    const missing=keys.filter(k=>!env[k]); if(missing.length) throw new Error(`Missing SMTP configuration: ${missing.join(', ')}`);
    let nodemailer; try { nodemailer=require('nodemailer'); } catch { throw new Error('Install nodemailer to enable SMTP'); }
    const port=Number(env.SMTP_PORT); if(!Number.isInteger(port)||port<1||port>65535) throw new Error('SMTP_PORT is invalid');
    return new SmtpProvider({from:env.EMAIL_FROM,transporter:nodemailer.createTransport({
      host:env.SMTP_HOST,port,secure:String(env.SMTP_SECURE).toLowerCase()==='true'||port===465,
      auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,pool:true
    })});
  }
  async send(m) { const r=await this.transporter.sendMail({from:this.from,to:m.to,cc:m.cc,bcc:m.bcc,replyTo:m.replyTo,subject:m.subject,text:m.text,html:m.html,headers:m.headers}); return {messageId:r.messageId,accepted:r.accepted||[],rejected:r.rejected||[]}; }
  async close() { this.transporter.close(); }
}
module.exports = { SmtpProvider };

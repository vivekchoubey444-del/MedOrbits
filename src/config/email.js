'use strict';

const nodemailer = require('nodemailer');
const { env } = require('./env');
const logger = require('./logger');

let transporter;

function getEmailTransporter() {
  if (!env.EMAIL_ENABLED) {
    throw new Error('Email is disabled. Set EMAIL_ENABLED=true to enable it.');
  }

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASSWORD are required when email is enabled.');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
      connectionTimeout: env.EMAIL_SEND_TIMEOUT_MS,
      socketTimeout: env.EMAIL_SEND_TIMEOUT_MS,
    });
  }

  return transporter;
}

async function sendEmail({ to, subject, text, html, replyTo }) {
  if (!to || !subject || (!text && !html)) {
    throw new TypeError('Email requires to, subject and text or html content.');
  }

  const transport = getEmailTransporter();
  const info = await transport.sendMail({
    from: { name: env.EMAIL_FROM_NAME, address: env.EMAIL_FROM_ADDRESS },
    replyTo: replyTo || env.EMAIL_REPLY_TO,
    to,
    subject,
    text,
    html,
  });

  logger.info({ messageId: info.messageId }, 'Email submitted to SMTP transport');
  return info;
}

async function verifyEmailTransport() {
  return getEmailTransporter().verify();
}

module.exports = { sendEmail, verifyEmailTransport, getEmailTransporter };

'use strict';
const { ServiceError, requireDependency, requiredString } = require('./service-utils');
function createEmailService({ provider, from, emailRepository, allowedHosts = [] }) {
  requireDependency(provider, 'email provider');
  const sender = requiredString(from, 'from', { max: 254 });
  async function send({ to, subject, text, html, template, variables = {}, metadata = {} }) {
    const recipient = requiredString(to, 'to', { max: 254 });
    if (!subject && !template) throw new ServiceError('Email subject or template is required.', { code: 'VALIDATION_ERROR', status: 422 });
    if (allowedHosts.length && !allowedHosts.includes(recipient.split('@')[1]?.toLowerCase())) throw new ServiceError('Recipient domain is not allowed.', { code: 'RECIPIENT_NOT_ALLOWED', status: 422 });
    const payload = { from: sender, to: recipient, subject, text, html, template, variables };
    const record = emailRepository?.create ? await emailRepository.create({ to: recipient, subject, status: 'queued', metadata }) : null;
    try {
      const result = typeof provider.send === 'function' ? await provider.send(payload) : await provider.sendMail(payload);
      if (record?.id && emailRepository?.updateById) await emailRepository.updateById(record.id, { status: 'sent', providerMessageId: result?.id || result?.messageId, sentAt: new Date() });
      return { accepted: true, messageId: result?.id || result?.messageId || null };
    } catch (error) {
      if (record?.id && emailRepository?.updateById) await emailRepository.updateById(record.id, { status: 'failed', failureCode: error.code || 'PROVIDER_ERROR' }).catch(() => undefined);
      throw new ServiceError('Email could not be delivered.', { code: 'EMAIL_DELIVERY_FAILED', status: 502 });
    }
  }
  return {
    send,
    sendVerificationEmail: ({ to, name, token }) => send({ to, subject: 'Verify your MedOrbits email', template: 'email-verification', variables: { name, token } }),
    sendPasswordResetEmail: ({ to, name, token }) => send({ to, subject: 'Reset your MedOrbits password', template: 'password-reset', variables: { name, token } }),
  };
}
module.exports = { createEmailService };

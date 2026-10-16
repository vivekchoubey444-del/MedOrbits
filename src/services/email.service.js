
'use strict';

const {
  ServiceError,
  requireDependency,
  requiredString,
} = require('./service-utils');

function createEmailService({
  provider,
  from,
  emailRepository,
  allowedHosts = [],
  appUrl,
}) {
  requireDependency(provider, 'email provider');

  const sender = requiredString(from, 'from', { max: 254 });

  if (
    !Array.isArray(allowedHosts) ||
    !allowedHosts.every((host) => typeof host === 'string')
  ) {
    throw new TypeError('allowedHosts must be an array of strings.');
  }

  const normalizedAllowedHosts = allowedHosts.map((host) =>
    host.trim().toLowerCase(),
  );

  const baseUrl = appUrl
    ? requiredString(appUrl, 'appUrl', { max: 2048 })
    : null;

  if (baseUrl) {
    let parsed;

    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new TypeError('appUrl must be a valid absolute URL.');
    }

    if (
      parsed.protocol !== 'https:' &&
      parsed.hostname !== 'localhost'
    ) {
      throw new TypeError('appUrl must use HTTPS.');
    }
  }

  function normalizeRecipient(value) {
    const recipient = requiredString(value, 'to', {
      max: 254,
    });

    // Deliberately support conventional email addresses rather than
    // attempting to implement the full RFC email-address grammar.
    if (
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)
    ) {
      throw new ServiceError('Invalid recipient email address.', {
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }

    const host = recipient.split('@').pop().toLowerCase();

    if (
      normalizedAllowedHosts.length > 0 &&
      !normalizedAllowedHosts.includes(host)
    ) {
      throw new ServiceError('Recipient domain is not allowed.', {
        code: 'RECIPIENT_NOT_ALLOWED',
        status: 422,
      });
    }

    return recipient;
  }

  async function updateEmailRecord(record, changes) {
    if (
      record?.id != null &&
      typeof emailRepository?.updateById === 'function'
    ) {
      await emailRepository.updateById(record.id, changes);
    }
  }

  async function send({
    to,
    subject,
    text,
    html,
    template,
    variables = {},
    metadata = {},
  } = {}) {
    const recipient = normalizeRecipient(to);

    const hasSubject =
      typeof subject === 'string' && subject.trim().length > 0;

    const hasTemplate =
      typeof template === 'string' && template.trim().length > 0;

    if (!hasSubject && !hasTemplate) {
      throw new ServiceError(
        'Email subject or template is required.',
        {
          code: 'VALIDATION_ERROR',
          status: 422,
        },
      );
    }

    if (
      text !== undefined &&
      typeof text !== 'string'
    ) {
      throw new ServiceError('text must be a string.', {
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }

    if (
      html !== undefined &&
      typeof html !== 'string'
    ) {
      throw new ServiceError('html must be a string.', {
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }

    if (
      !variables ||
      typeof variables !== 'object' ||
      Array.isArray(variables)
    ) {
      throw new ServiceError('variables must be an object.', {
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }

    if (
      !metadata ||
      typeof metadata !== 'object' ||
      Array.isArray(metadata)
    ) {
      throw new ServiceError('metadata must be an object.', {
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }

    const payload = {
      from: sender,
      to: recipient,
      subject: hasSubject ? subject.trim() : subject,
      text,
      html,
      template,
      variables,
    };

    let record = null;

    // Logging failures should not silently disappear. If email logging
    // is configured, failure to create its record stops delivery.
    if (typeof emailRepository?.create === 'function') {
      record = await emailRepository.create({
        to: recipient,
        subject: payload.subject || template,
        template: template || null,
        status: 'queued',
        metadata: {
          ...metadata,
          template: template || null,
        },
      });
    }

    try {
      let result;

      if (typeof provider.send === 'function') {
        result = await provider.send(payload);
      } else if (typeof provider.sendMail === 'function') {
        result = await provider.sendMail(payload);
      } else {
        throw new ServiceError(
          'Email provider must implement send() or sendMail().',
          {
            code: 'EMAIL_PROVIDER_MISCONFIGURED',
            status: 503,
          },
        );
      }

      const messageId = result?.id || result?.messageId || null;

      await updateEmailRecord(record, {
        status: 'sent',
        providerMessageId: messageId,
        sentAt: new Date(),
      });

      return {
        accepted: true,
        messageId,
      };
    } catch (error) {
      try {
        await updateEmailRecord(record, {
          status: 'failed',
          failureCode:
            typeof error?.code === 'string'
              ? error.code
              : 'PROVIDER_ERROR',
        });
      } catch {
        // Use infrastructure monitoring for persistence failures.
      }

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        'Email could not be delivered.',
        {
          code: 'EMAIL_DELIVERY_FAILED',
          status: 502,
        },
      );
    }
  }

  function buildActionUrl(path, token) {
    if (!baseUrl) {
      throw new ServiceError(
        'Email action URL configuration is missing.',
        {
          code: 'EMAIL_CONFIGURATION_ERROR',
          status: 503,
        },
      );
    }

    const safeToken = requiredString(token, 'token', {
      max: 256,
    });

    const url = new URL(path, baseUrl);
    url.searchParams.set('token', safeToken);

    return url.toString();
  }

  return {
    send,

    async sendVerificationEmail({
      to,
      name,
      token,
      expiryMinutes = 30,
    }) {
      const verificationUrl = buildActionUrl(
        '/verify-email',
        token,
      );

      return send({
        to,
        subject: 'Verify your MedOrbits email',
        template: 'verification',
        variables: {
          firstName: name || '',
          email: to,
          verificationUrl,
          expiryMinutes,
          year: new Date().getFullYear(),
        },
        metadata: {
          category: 'email_verification',
        },
      });
    },

    async sendPasswordResetEmail({
      to,
      name,
      token,
      expiryMinutes = 30,
    }) {
      const resetUrl = buildActionUrl(
        '/reset-password',
        token,
      );

      return send({
        to,
        subject: 'Reset your MedOrbits password',
        template: 'password-reset',
        variables: {
          firstName: name || '',
          email: to,
          resetUrl,
          expiryMinutes,
          year: new Date().getFullYear(),
        },
        metadata: {
          category: 'password_reset',
        },
      });
    },
  };
}

module.exports = { createEmailService };

'use strict';
function isEmail(v) { return typeof v === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v); }
function validateMessage(m) {
  if (!m || typeof m !== 'object') throw new TypeError('Email message is required');
  const to = Array.isArray(m.to) ? m.to : [m.to];
  if (!to.length || to.some(v => !isEmail(v))) throw new TypeError('Valid recipient email is required');
  if (typeof m.subject !== 'string' || !m.subject.trim()) throw new TypeError('Email subject is required');
  if (m.html == null && m.text == null) throw new TypeError('html or text content is required');
  for (const k of ['cc','bcc','replyTo']) if (m[k] != null && (Array.isArray(m[k]) ? m[k] : [m[k]]).some(v => !isEmail(v))) throw new TypeError(`Invalid ${k} email`);
  return {...m, to};
}
class EmailClient {
  constructor(provider) { if (!provider || typeof provider.send !== 'function') throw new TypeError('Email provider is required'); this.provider = provider; }
  send(message) { return this.provider.send(validateMessage(message)); }
  async close() { if (this.provider.close) await this.provider.close(); }
}
module.exports = { EmailClient, validateMessage, isEmail };

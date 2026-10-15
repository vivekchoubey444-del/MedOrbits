'use strict';
class EmailProvider {
  async send(_message) { throw new Error('EmailProvider.send(message) must be implemented'); }
  async close() {}
}
module.exports = { EmailProvider };

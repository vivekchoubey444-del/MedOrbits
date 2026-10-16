‘use strict’;

/**

* MedOrbits -- Abstract Email Provider
* File: src/integrations/email/email.provider.js
* Contract:
* ●	send(message): deliver a validated email message.
* ●	close(): release provider resources when supported.
* Implementations may include SMTP or another approved email service.
    */

const REQUIRED_METHODS = Object.freeze([‘send’]);

class EmailProvider {
constructor() {
if (new.target === EmailProvider) {
throw new TypeError(
‘EmailProvider is abstract and cannot be instantiated directly.’
);
}

for (const method of REQUIRED_METHODS) {
  if (
    typeof this[method] !== 'function' ||
    this[method] === EmailProvider.prototype[method]
  ) {
    throw new TypeError(
      `${new.target.name || 'Email provider'} must implement ${method}().`
    );
  }
}

}

async send(_message) {
throw new Error(
‘EmailProvider.send(message) must be implemented.’
);
}

async close() {
// Override when the provider owns resources that need cleanup.
}
}

module.exports = {
EmailProvider,
};
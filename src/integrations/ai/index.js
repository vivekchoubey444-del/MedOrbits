'use strict';

/**

* MedOrbits -- AI Integration Entry Point
* File: src/integrations/ai/index.js
* Responsibilities:
* ●	Construct a configured AI client.
* ●	Support injected providers for testing and alternative backends.
* ●	Expose the AI provider contract and configuration loader.
* This module does not execute AI requests by itself.
    */

const { AiClient } = require('./ai.client');
const { AiProvider } = require('./ai.provider');
const { OpenAiProvider } = require('./openai.provider');
const { loadAiConfig } = require('./ai.config');

function validateProvider(provider) {
if (
!provider ||
typeof provider.generateText !== 'function'
) {
throw new TypeError(
'AI provider must implement generateText(request).'
);
}

if (
provider.close != null &&
typeof provider.close !== 'function'
) {
throw new TypeError(
'AI provider close must be a function when provided.'
);
}

return provider;
}

function createAiClient(options = {}) {
if (
!options ||
typeof options !== 'object' ||
Array.isArray(options)
) {
throw new TypeError('AI client options must be an object.');
}

const provider = options.provider
? validateProvider(options.provider)
: new OpenAiProvider(
options.config || loadAiConfig(options.env || process.env)
);

return new AiClient(provider, options.clientOptions);
}

module.exports = {
createAiClient,
AiClient,
AiProvider,
OpenAiProvider,
loadAiConfig,
};
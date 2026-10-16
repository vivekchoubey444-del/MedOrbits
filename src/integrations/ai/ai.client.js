‘use strict’;

/**

* MedOrbits -- AI Client
* File: src/integrations/ai/ai.client.js
* Responsibilities:
* ●	Validate text-generation requests.
* ●	Delegate generation to the configured AI provider.
* ●	Enforce basic request and response limits.
* ●	Prevent use after the client is closed.
* Provider-specific API calls, prompts, model selection, and
* provider credentials belong in the provider/configuration layer.
    */

const DEFAULT_MAX_INPUT_LENGTH = 50_000;
const DEFAULT_MAX_OUTPUT_LENGTH = 200_000;

function positiveInteger(value, name, fallback) {
if (value == null) {
return fallback;
}

if (!Number.isSafeInteger(value) || value < 1) {
throw new TypeError(${name} must be a positive safe integer.);
}

return value;
}

function validateRequest(request, maxInputLength) {
if (
!request ||
typeof request !== ‘object’ ||
Array.isArray(request)
) {
throw new TypeError(‘AI generation request must be an object.’);
}

const { prompt } = request;

if (typeof prompt !== ‘string’ || !prompt.trim()) {
throw new TypeError(‘A non-empty prompt is required.’);
}

if (prompt.length > maxInputLength) {
throw new RangeError(‘AI prompt exceeds the configured input limit.’);
}

return {
…request,
prompt: prompt.trim(),
};
}

function validateResponse(response, maxOutputLength) {
if (
!response ||
typeof response !== ‘object’ ||
Array.isArray(response)
) {
throw new TypeError(‘AI provider returned an invalid response.’);
}

if (typeof response.text !== ‘string’) {
throw new TypeError(
‘AI provider response must contain a text string.’
);
}

if (response.text.length > maxOutputLength) {
throw new RangeError(‘AI response exceeds the configured output limit.’);
}

return response;
}

class AiClient {
#provider;
#closed = false;
#maxInputLength;
#maxOutputLength;

constructor(provider, options = {}) {
if (
!provider ||
typeof provider.generateText !== ‘function’
) {
throw new TypeError(
‘AI provider must implement generateText(request).’
);
}

if (
  !options ||
  typeof options !== 'object' ||
  Array.isArray(options)
) {
  throw new TypeError('AI client options must be an object.');
}
this.#provider = provider;
this.#maxInputLength = positiveInteger(
  options.maxInputLength,
  'maxInputLength',
  DEFAULT_MAX_INPUT_LENGTH
);
this.#maxOutputLength = positiveInteger(
  options.maxOutputLength,
  'maxOutputLength',
  DEFAULT_MAX_OUTPUT_LENGTH
);

}

async generateText(request) {
if (this.#closed) {
throw new Error(‘AI client is closed.’);
}

const validatedRequest = validateRequest(
  request,
  this.#maxInputLength
);
const response = await this.#provider.generateText(
  validatedRequest
);
return validateResponse(
  response,
  this.#maxOutputLength
);

}

async close() {
if (this.#closed) {
return;
}

this.#closed = true;
if (typeof this.#provider.close === 'function') {
  await this.#provider.close();
}

}
}

module.exports = {
AiClient,
validateRequest,
validateResponse,
};
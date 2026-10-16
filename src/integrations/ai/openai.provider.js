‘use strict’;

/**

* MedOrbits -- OpenAI-Compatible Text Generation Provider
* File: src/integrations/ai/openai.provider.js
* Requires:
* ●	Node.js 20+
* ●	Built-in fetch and AbortController
* ●	src/integrations/ai/ai.provider.js
* ●	src/integrations/ai/ai.config.js
* Response contract:
* { text: string, model: string, usage: object | null }
    */

const { AiProvider } = require(’./ai.provider’);
const { loadAiConfig } = require(’./ai.config’);

const MAX_SYSTEM_PROMPT_CHARS = 4_000;
const MAX_MODEL_LENGTH = 128;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

function validatePositiveInteger(value, name, maximum) {
if (
!Number.isSafeInteger(value) ||
value < 1 ||
value > maximum
) {
throw new TypeError(
${name} must be an integer between 1 and ${maximum}.
);
}

return value;
}

function validateTemperature(value) {
if (value == null) {
return 0.2;
}

if (
typeof value !== ‘number’ ||
!Number.isFinite(value) ||
value < 0 ||
value > 2
) {
throw new TypeError(
‘temperature must be a finite number between 0 and 2.’
);
}

return value;
}

function validateModel(value, fallback) {
const model = value == null ? fallback : value;

if (
typeof model !== ‘string’ ||
!model.trim() ||
model.length > MAX_MODEL_LENGTH ||
/[\r\n\0]/.test(model)
) {
throw new TypeError(‘Invalid AI model name.’);
}

return model.trim();
}

function createProviderError(message, code, status) {
const error = new Error(message);
error.code = code;

if (status != null) {
error.status = status;
}

return error;
}

class OpenAiProvider extends AiProvider {
constructor(config = loadAiConfig()) {
super();

if (!config || typeof config !== 'object') {
  throw new TypeError('AI configuration is required.');
}
if (
  typeof config.apiKey !== 'string' ||
  !config.apiKey.trim()
) {
  throw new Error('AI_API_KEY is required.');
}
if (
  typeof config.baseUrl !== 'string' ||
  !config.baseUrl.trim()
) {
  throw new Error('A valid AI API base URL is required.');
}
if (
  typeof fetch !== 'function' ||
  typeof AbortController !== 'function'
) {
  throw new Error(
    'This provider requires Node.js built-in fetch and AbortController.'
  );
}
this.config = Object.freeze({ ...config });
this.closed = false;

}

async generateText(request) {
if (this.closed) {
throw new Error(‘AI provider is closed.’);
}

if (
  !request ||
  typeof request !== 'object' ||
  Array.isArray(request)
) {
  throw new TypeError('AI generation request must be an object.');
}
if (
  typeof request.prompt !== 'string' ||
  !request.prompt.trim()
) {
  throw new TypeError('A non-empty prompt is required.');
}
if (request.prompt.length > this.config.maxInputChars) {
  throw new RangeError(
    'Prompt exceeds the configured input limit.'
  );
}
const prompt = request.prompt.trim();
let systemMessage;
if (request.system != null) {
  if (typeof request.system !== 'string') {
    throw new TypeError('System instructions must be a string.');
  }
  systemMessage = request.system.slice(
    0,
    MAX_SYSTEM_PROMPT_CHARS
  );
}
const model = validateModel(
  request.model,
  this.config.model
);
const maxOutputTokens = validatePositiveInteger(
  request.maxOutputTokens == null
    ? this.config.maxOutputTokens
    : request.maxOutputTokens,
  'maxOutputTokens',
  this.config.maxOutputTokens
);
const temperature = validateTemperature(request.temperature);
const controller = new AbortController();
const timeoutMs = validatePositiveInteger(
  this.config.timeoutMs,
  'timeoutMs',
  120_000
);
let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  controller.abort();
}, timeoutMs);
if (typeof timer.unref === 'function') {
  timer.unref();
}
try {
  const messages = [];
  if (systemMessage) {
    messages.push({
      role: 'system',
      content: systemMessage,
    });
  }
  messages.push({
    role: 'user',
    content: prompt,
  });
  const response = await fetch(
    `${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`,
    {
      method: 'POST',
      signal: controller.signal,
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxOutputTokens,
        temperature,
      }),
    }
  );
  if (!response.ok) {
    const status = response.status;
    try {
      await response.body?.cancel();
    } catch {
      // Preserve the original provider error.
    }
    if (status === 401 || status === 403) {
      throw createProviderError(
        'AI provider authentication or permission failed.',
        'AI_AUTH_ERROR',
        502
      );
    }
    if (status === 429) {
      throw createProviderError(
        'AI provider rate limit or quota restriction was reached.',
        'AI_RATE_LIMIT',
        503
      );
    }
    if (status >= 500) {
      throw createProviderError(
        'AI provider is temporarily unavailable.',
        'AI_PROVIDER_ERROR',
        502
      );
    }
    throw createProviderError(
      'AI provider rejected the generation request.',
      'AI_REQUEST_ERROR',
      502
    );
  }
  const contentLength = Number(
    response.headers.get('content-length')
  );
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_RESPONSE_BYTES
  ) {
    await response.body?.cancel();
    throw createProviderError(
      'AI provider response exceeded the permitted size.',
      'AI_RESPONSE_TOO_LARGE',
      502
    );
  }
  const body = await response.text();
  if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) {
    throw createProviderError(
      'AI provider response exceeded the permitted size.',
      'AI_RESPONSE_TOO_LARGE',
      502
    );
  }
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw createProviderError(
      'AI provider returned an invalid JSON response.',
      'AI_INVALID_RESPONSE',
      502
    );
  }
  const choice = data?.choices?.[0];
  const text = choice?.message?.content;
  if (typeof text !== 'string') {
    throw createProviderError(
      'AI provider returned an unexpected response structure.',
      'AI_INVALID_RESPONSE',
      502
    );
  }
  return {
    text,
    model: data.model || model,
    usage: data.usage || null,
  };
} catch (error) {
  if (timedOut || error?.name === 'AbortError') {
    throw createProviderError(
      'AI request timed out.',
      'AI_TIMEOUT',
      504
    );
  }
  if (error?.code) {
    throw error;
  }
  throw createProviderError(
    'AI provider request failed.',
    'AI_NETWORK_ERROR',
    502
  );
} finally {
  clearTimeout(timer);
}

}

async close() {
this.closed = true;
}
}

module.exports = {
OpenAiProvider,
};
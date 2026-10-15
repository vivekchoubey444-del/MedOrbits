'use strict';
function loadAiConfig(env=process.env) {
  const n=(key,def,min,max)=>{const v=Number(env[key]||def);if(!Number.isInteger(v)||v<min||v>max)throw new Error(`${key} must be between ${min} and ${max}`);return v;};
  return {apiKey:env.AI_API_KEY||'',baseUrl:(env.AI_API_URL||'https://api.openai.com/v1').replace(/\/+$/,''),model:env.AI_MODEL||'gpt-4o-mini',timeoutMs:n('AI_TIMEOUT_MS',20000,1000,120000),maxOutputTokens:n('AI_MAX_OUTPUT_TOKENS',800,1,8000),maxInputChars:n('AI_MAX_INPUT_CHARS',12000,1,100000)};
}
module.exports={loadAiConfig};

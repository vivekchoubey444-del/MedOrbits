'use strict';
class AiClient { constructor(provider){if(!provider||typeof provider.generateText!=='function')throw new TypeError('AI provider is required');this.provider=provider;} generateText(request){return this.provider.generateText(request);} }
module.exports={AiClient};

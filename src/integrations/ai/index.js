'use strict';
const {AiClient}=require('./ai.client');const {AiProvider}=require('./ai.provider');const {OpenAiProvider}=require('./openai.provider');const {loadAiConfig}=require('./ai.config');
function createAiClient(o={}){return new AiClient(o.provider||new OpenAiProvider(o.config||loadAiConfig(o.env||process.env)));}
module.exports={createAiClient,AiClient,AiProvider,OpenAiProvider,loadAiConfig};

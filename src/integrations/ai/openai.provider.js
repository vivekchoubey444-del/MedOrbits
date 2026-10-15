'use strict';
const {AiProvider}=require('./ai.provider'); const {loadAiConfig}=require('./ai.config');
class OpenAiProvider extends AiProvider {
  constructor(config=loadAiConfig()){super();if(!config.apiKey)throw new Error('AI_API_KEY is required');if(typeof fetch!=='function')throw new Error('Node.js built-in fetch is required');this.config=config;}
  async generateText(r){
    if(!r||typeof r.prompt!=='string'||!r.prompt.trim())throw new TypeError('Non-empty prompt required');
    if(r.prompt.length>this.config.maxInputChars)throw new RangeError('Prompt exceeds configured limit');
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),this.config.timeoutMs);
    try{
      const response=await fetch(`${this.config.baseUrl}/chat/completions`,{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${this.config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:r.model||this.config.model,messages:[...(r.system?[{role:'system',content:String(r.system).slice(0,4000)}]:[]),{role:'user',content:r.prompt}],max_tokens:Math.min(Number(r.maxOutputTokens||this.config.maxOutputTokens),this.config.maxOutputTokens),temperature:r.temperature==null?.2:Math.max(0,Math.min(2,Number(r.temperature)))})});
      const data=await response.json().catch(()=>({})); if(!response.ok){const e=new Error(`AI provider returned HTTP ${response.status}`);e.code='AI_PROVIDER_ERROR';e.status=response.status>=500?502:400;throw e;}
      const text=data.choices?.[0]?.message?.content;if(typeof text!=='string')throw new Error('Unexpected AI response');return {text,model:data.model||r.model||this.config.model,usage:data.usage||null};
    }catch(e){if(e.name==='AbortError'){const x=new Error('AI request timed out');x.code='AI_TIMEOUT';throw x;}throw e;}finally{clearTimeout(timer);}
  }
}
module.exports={OpenAiProvider};

'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');const {loadStorageConfig}=require('./storage.config');
class LocalStorageProvider{
 constructor(c=loadStorageConfig()){this.root=path.resolve(c.root);this.maxFileBytes=c.maxFileBytes;}
 resolveKey(key){if(typeof key!=='string'||!key||key.includes('\0')||key.includes('\\'))throw new TypeError('Invalid storage key');const parts=key.split('/');if(parts.some(p=>!p||p==='.'||p==='..'||!/^[a-zA-Z0-9._-]+$/.test(p)))throw new TypeError('Invalid storage key segment');const out=path.resolve(this.root,...parts);if(!out.startsWith(this.root+path.sep))throw new Error('Storage key escapes root');return out;}
 async put({key,body,contentType='application/octet-stream'}){const target=this.resolveKey(key),data=Buffer.isBuffer(body)?body:body instanceof Uint8Array?Buffer.from(body):null;if(!data)throw new TypeError('body must be Buffer or Uint8Array');if(data.length>this.maxFileBytes)throw new RangeError('File too large');await fs.mkdir(path.dirname(target),{recursive:true,mode:0o700});const tmp=`${target}.${crypto.randomUUID()}.tmp`;try{await fs.writeFile(tmp,data,{flag:'wx',mode:0o600});await fs.rename(tmp,target);}catch(e){await fs.rm(tmp,{force:true}).catch(()=>{});throw e;}return {key,size:data.length,contentType,sha256:crypto.createHash('sha256').update(data).digest('hex')};}
 async get(key){const body=await fs.readFile(this.resolveKey(key));return {key,body,size:body.length};}
 async delete(key){await fs.rm(this.resolveKey(key),{force:true});return {key,deleted:true};}
}
module.exports={LocalStorageProvider};

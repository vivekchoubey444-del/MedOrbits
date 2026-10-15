'use strict';
const {loadStorageConfig}=require('./storage.config');
class S3StorageProvider{
 constructor({client,commands,bucket,prefix=''}){if(!client||!commands||!bucket)throw new TypeError('S3 client, commands and bucket required');Object.assign(this,{client,commands,bucket,prefix});}
 static fromEnv(env=process.env){const c=loadStorageConfig(env);if(!c.s3.bucket)throw new Error('S3_BUCKET is required');let sdk;try{sdk=require('@aws-sdk/client-s3');}catch{throw new Error('Install @aws-sdk/client-s3');}return new S3StorageProvider({client:new sdk.S3Client({region:c.s3.region,...(c.s3.endpoint?{endpoint:c.s3.endpoint}:{}),forcePathStyle:c.s3.forcePathStyle}),commands:sdk,bucket:c.s3.bucket,prefix:c.s3.prefix});}
 key(k){if(typeof k!=='string'||!k||k.startsWith('/')||k.split('/').some(p=>!p||p==='.'||p==='..'||!/^[a-zA-Z0-9._-]+$/.test(p)))throw new TypeError('Invalid object key');return this.prefix+k;}
 async put({key,body,contentType='application/octet-stream'}){const data=Buffer.isBuffer(body)?body:body instanceof Uint8Array?Buffer.from(body):null;if(!data)throw new TypeError('body must be Buffer or Uint8Array');await this.client.send(new this.commands.PutObjectCommand({Bucket:this.bucket,Key:this.key(key),Body:data,ContentType:contentType,ServerSideEncryption:'AES256'}));return {key,size:data.length,contentType};}
 async get(key){const r=await this.client.send(new this.commands.GetObjectCommand({Bucket:this.bucket,Key:this.key(key)}));const chunks=[];for await(const c of r.Body)chunks.push(Buffer.from(c));const body=Buffer.concat(chunks);return {key,body,size:body.length,contentType:r.ContentType};}
 async delete(key){await this.client.send(new this.commands.DeleteObjectCommand({Bucket:this.bucket,Key:this.key(key)}));return {key,deleted:true};}
}
module.exports={S3StorageProvider};

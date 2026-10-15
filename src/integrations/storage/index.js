'use strict';
const {StorageClient}=require('./storage.client');const {LocalStorageProvider}=require('./local.provider');const {S3StorageProvider}=require('./s3.provider');const {loadStorageConfig}=require('./storage.config');
function createStorageClient(o={}){if(o.provider)return new StorageClient(o.provider);const env=o.env||process.env,c=o.config||loadStorageConfig(env);return new StorageClient(c.driver==='s3'?S3StorageProvider.fromEnv(env):new LocalStorageProvider(c));}
module.exports={createStorageClient,StorageClient,LocalStorageProvider,S3StorageProvider,loadStorageConfig};

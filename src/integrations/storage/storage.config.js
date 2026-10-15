'use strict';
const path=require('node:path');
function loadStorageConfig(env=process.env){const driver=(env.STORAGE_DRIVER||'local').toLowerCase();if(!['local','s3'].includes(driver))throw new Error('STORAGE_DRIVER must be local or s3');return {driver,root:path.resolve(env.STORAGE_LOCAL_ROOT||path.join(process.cwd(),'storage','private')),maxFileBytes:Number(env.STORAGE_MAX_FILE_BYTES||10485760),s3:{region:env.S3_REGION||'ap-south-1',bucket:env.S3_BUCKET||'',endpoint:env.S3_ENDPOINT||'',forcePathStyle:String(env.S3_FORCE_PATH_STYLE)==='true',prefix:(env.S3_PREFIX||'private/').replace(/^\/+/, '')}};}
module.exports={loadStorageConfig};

'use strict';
class StorageClient{constructor(provider){if(!provider||!['put','get','delete'].every(k=>typeof provider[k]==='function'))throw new TypeError('Storage provider must implement put/get/delete');this.provider=provider;}put(v){return this.provider.put(v);}get(k){return this.provider.get(k);}delete(k){return this.provider.delete(k);}}
module.exports={StorageClient};

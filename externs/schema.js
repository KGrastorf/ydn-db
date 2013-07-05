/**
 * @fileoverview Schema format.
 *
 * @externs
 */



/**
 * @constructor
 */
function IndexSchema() {}


/**
 * @type {string}
 */
IndexSchema.prototype.name;


/**
 * @type {string}
 */
IndexSchema.prototype.type;


/**
 * @type {boolean}
 */
IndexSchema.prototype.unique;


/**
 * @type {string}
 */
IndexSchema.prototype.keyPath;


/**
 * @type {boolean}
 */
IndexSchema.prototype.multiEntry;


/**
 * Index key generator. Generator function will be invoked when a record value
 * is about to 'add' or 'put' to the object store. Returning a valid IDBKey
 * or undefined will set to the record value while ignoring invalid IDBKeys.
 * @type {Function}
 */
IndexSchema.prototype.generator;



/**
 * @constructor
 */
var KeyPaths = function() {};


/**
 * @type {string}
 */
KeyPaths.prototype.id;


/**
 * @type {string}
 */
KeyPaths.prototype.etag;


/**
 * @type {string}
 */
KeyPaths.prototype.nextUrl;


/**
 * @type {string}
 */
KeyPaths.prototype.updated;



/**
 * @constructor
 */
var BaseOptions = function() {};


/**
 * @type {string}
 */
BaseOptions.prototype.delimiter;


/**
 * @type {boolean}
 */
BaseOptions.prototype.keepMeta;


/**
 * Store name which store meta data.
 * If specified, metaData must not specified.
 * @type {string}
 */
BaseOptions.prototype.metaStoreName;


/**
 * Meta data data field.
 * If specified, metaStoreName must not specified.
 * @type {string}
 */
BaseOptions.prototype.metaDataName;



/**
 * @constructor
 * @extends {BaseOptions}
 */
var AtomOptions = function() {};



/**
 * @see http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGET.html
 * @extends {AtomOptions}
 * @constructor
 */
var S3Options = function() {};


/**
 * @type {string?}
 */
S3Options.prototype.delimiter;


/**
 * @type {string?}
 */
S3Options.prototype.maxKeys;


/**
 * @type {string?}
 */
S3Options.prototype.prefix;


/**
 * Bucket name.
 * @type {string}
 */
S3Options.prototype.bucket;



/**
 * @extends {AtomOptions}
 * @constructor
 */
var GDataOptions = function() {};


/**
 * @type {string?}
 */
GDataOptions.prototype.version;


/**
 * @type {string}
 */
GDataOptions.prototype.kind;


/**
 * @type {string?}
 */
GDataOptions.prototype.projection;


/**
 * @type {string}
 */
GDataOptions.prototype.domain;


/**
 * @type {string}
 */
GDataOptions.prototype.siteName;


/**
 * @type {boolean?}
 */
GDataOptions.prototype.prefetch;



/**
 * @extends {GDataOptions}
 * @constructor
 */
var GDataJsonOptions = function() {};


/**
 * Base uri path post fix. This can be found in "path" of resources method in
 * Google API discovery.
 * @type {string}
 */
GDataJsonOptions.prototype.prefix;



/**
 * @extends {AtomOptions}
 * @constructor
 */
var ODataOptions = function() {};



/**
 * Synchronization option for a store.
 * @constructor
 */
function StoreSyncOptionJson() {}


/**
 * Backend service format. Valid values are 'rest', 's3', 'gcs', 'atom',
 * 'odata', 'gdata'.
 * @type {string}
 */
StoreSyncOptionJson.prototype.format;


/**
 * Base URI.
 * @type {string}
 */
StoreSyncOptionJson.prototype.baseUri;


/**
 * Immutable database.
 * @type {boolean}
 */
StoreSyncOptionJson.prototype.immutable;


/**
 * HTTP transport. This is compatible with Google Javascript Client request
 * https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiclientrequest
 * @type {{request: Function}}
 */
StoreSyncOptionJson.prototype.transport;


/**
 * Backend specific sync options.
 * @type {BaseOptions|AtomOptions|GDataOptions|ODataOptions|S3Options}
 */
StoreSyncOptionJson.prototype.Options;


/**
 * Entry list fetch strategy. Supported method are
 * ['last-updated', 'descending-key']
 * @type {Array}
 */
StoreSyncOptionJson.prototype.fetchStrategies;



/**
 * @constructor
 */
function StoreSchema() {}


/**
 * @type {string}
 */
StoreSchema.prototype.name;


/**
 * @type {string}
 */
StoreSchema.prototype.keyPath;


/**
 * @type {boolean}
 */
StoreSchema.prototype.autoIncrement;


/**
 * @type {string}
 */
StoreSchema.prototype.type;


/**
 * @type {Array.<!IndexSchema>}
 */
StoreSchema.prototype.indexes;


/**
 * @type {boolean}
 */
StoreSchema.prototype.dispatchEvents;


/**
 * A fixed schema.
 * @type {boolean}
 */
StoreSchema.prototype.fixed;


/**
 * Name of sync
 * @type {StoreSyncOptionJson}
 */
StoreSchema.prototype.Sync;



/**
 * @constructor
 */
function MetaData() {}


/**
 * @type {string}
 */
MetaData.prototype.id;


/**
 * @type {string}
 */
MetaData.prototype.etag;


/**
 * @type {number}
 */
MetaData.prototype.updated;


/**
 * @type {number}
 */
MetaData.prototype.expires;


/**
 * @type {number}
 */
MetaData.prototype.date;



/**
 * @constructor
 */
function DatabaseSchema() {}


/**
 * @type {number}
 */
DatabaseSchema.prototype.version;


/**
 * @type {Array.<!StoreSchema>}
 */
DatabaseSchema.prototype.stores;

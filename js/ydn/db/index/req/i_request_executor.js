
/**
 * @fileoverview Interface for index base request.
 *
 */


goog.provide('ydn.db.index.req.IRequestExecutor');
goog.require('ydn.db.Streamer');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.index.req.AbstractCursor');



/**
 * @interface
 * @extends {ydn.db.crud.req.IRequestExecutor}
 */
ydn.db.index.req.IRequestExecutor = function() {};


/**
 * List record in a store.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {string} tx_no transaction number.
 * @param {?function(*, boolean=)} return key in deferred function.
 * @param {!ydn.db.Iterator} store_name  store name.
 * @param {number=} opt_limit limit.
 * @param {number=} opt_offset offset.
 */
ydn.db.index.req.IRequestExecutor.prototype.keysByIterator =
    goog.abstractMethod;


/**
 * List record in a store.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {string} tx_no transaction number.
 * @param {?function(*, boolean=)} df key in deferred function.
 * @param {!ydn.db.Iterator} store_name  store name.
 * @param {number=} opt_limit limit.
 * @param {number=} opt_offset offset.
 */
ydn.db.index.req.IRequestExecutor.prototype.listByIterator =
    goog.abstractMethod;


/**
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {string} tx_no transaction number.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index.
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec.
 * @param {boolean} key_only mode.
 * @param {boolean} key_query true for keys query method.
 * @return {!ydn.db.index.req.AbstractCursor} cursor.
 */
ydn.db.index.req.IRequestExecutor.prototype.getCursor = goog.abstractMethod;


/**
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {string} tx_no transaction number.
 * @param {string} store_name
 * @param {string=} opt_index_name
 * @return {!ydn.db.Streamer}
 */
ydn.db.index.req.IRequestExecutor.prototype.getStreamer = goog.abstractMethod;


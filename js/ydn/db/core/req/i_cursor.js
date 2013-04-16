/**
 * @fileoverview cursor interface.
 */


goog.provide('ydn.db.core.req.ICursor');
goog.require('goog.disposable.IDisposable');


/**
 * @interface
 * @extends {goog.disposable.IDisposable}
 */
ydn.db.core.req.ICursor = function() {};


/**
 *
 * @param {!Error} error
 */
ydn.db.core.req.ICursor.prototype.onError = goog.abstractMethod;


/**
 * onSuccess handler is called before onNext callback. The purpose of
 * onSuccess handler is apply filter. If filter condition are not meet,
 * onSuccess return next advancement value skipping onNext callback.
 *
 * @param {IDBKey=} primary_key
 * @param {IDBKey=} key
 * @param {*=} value
 * @return {*}
 */
ydn.db.core.req.ICursor.prototype.onSuccess = goog.abstractMethod;


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {IDBKey=} opt_ini_key effective key to resume position.
 * @param {IDBKey=} opt_ini_primary_key primary key to resume position.
 */
ydn.db.core.req.ICursor.prototype.openCursor = goog.abstractMethod;


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey} opt_primary_key primary key position to continue.
 */
ydn.db.core.req.ICursor.prototype.continuePrimaryKey = goog.abstractMethod;


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} opt_effective_key effective key position to continue.
 */
ydn.db.core.req.ICursor.prototype.continueEffectiveKey = goog.abstractMethod;


/**
 * Move cursor position to the effective key.
 * @param {number} number_of_step
 */
ydn.db.core.req.ICursor.prototype.advance = goog.abstractMethod;


/**
 * Restart the cursor. If previous cursor position is given,
 * the position is skip.
 * @param {IDBKey=} effective_key previous position.
 * @param {IDBKey=} primary_key
 */
ydn.db.core.req.ICursor.prototype.restart = goog.abstractMethod;


/**
 * @return {boolean}
 */
ydn.db.core.req.ICursor.prototype.hasCursor =  goog.abstractMethod;


/**
 * @param {!Object} obj record value.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.core.req.ICursor.prototype.update = goog.abstractMethod;


/**
 * Clear record
 * @return {!goog.async.Deferred} value.
 */
ydn.db.core.req.ICursor.prototype.clear = goog.abstractMethod;


/**
 *
 * @return {boolean} return true if this is an index cursor.
 */
ydn.db.core.req.ICursor.prototype.isIndexCursor = goog.abstractMethod;


/**
 *
 * @return {boolean} return true if this is an value cursor.
 */
ydn.db.core.req.ICursor.prototype.isValueCursor = goog.abstractMethod;
/**
 *
 * @fileoverview Front-end cursor.
 *
 */

goog.provide('ydn.db.Cursor');
goog.require('goog.debug.Logger');
goog.require('ydn.db.index.req.ICursor');
goog.require('ydn.debug.error.InternalError');
goog.require('ydn.db');



/**
 *
 * @param {Array.<ydn.db.index.req.ICursor>} cursors cursors.
 * @constructor
 */
ydn.db.Cursor = function(cursors) {

  this.cursors_ = cursors;
  this.keys_ = [];
  this.primary_keys_ = [];
  this.values_ = [];
  this.merges_value_ = null;
  this.count_ = 0;
  this.done_ = false;
  this.exited_ = false;
  this.init_();

};


/**
 * @type {Array.<ydn.db.index.req.ICursor>}
 * @private
 */
ydn.db.Cursor.prototype.cursors_;


/**
 * @type {Array.<IDBKey|undefined>} current cursor keys.
 * @private
 */
ydn.db.Cursor.prototype.keys_;


/**
 * @type {Array.<IDBKey|undefined>} current cursor primary keys.
 * @private
 */
ydn.db.Cursor.prototype.primary_keys_;


/**
 * @type {Array.<*>} current cursor values.
 * @private
 */
ydn.db.Cursor.prototype.values_;


/**
 *
 * @type {Object}
 * @private
 */
ydn.db.Cursor.prototype.merges_value_ = null;


/**
 *
 * @type {number}
 * @private
 */
ydn.db.Cursor.prototype.count_ = 0;


/**
 * Done flag is true if one of the cursor lost its position.
 * @type {boolean} done state.
 * @private
 */
ydn.db.Cursor.prototype.done_ = false;


/**
 * Exited flag is true if the iterator is explicitly exited, usually before
 * done flag to true.
 * @type {boolean} exited flag.
 * @private
 */
ydn.db.Cursor.prototype.exited_ = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.Cursor.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.Cursor');


/**
 *
 * @private
 */
ydn.db.Cursor.prototype.init_ = function() {
  var n = this.cursors_.length;
  var result_count = 0;
  var me = this;
  var listenCursor = function(i) {
    var cursor = me.cursors_[i];
    // if there is previous position, the cursor must advance over previous
    // position.
    var cued = !goog.isDefAndNotNull(me.keys_[i]);
    /**
     * On success handler.
     * @param {IDBKey=} opt_key effective key.
     * @param {IDBKey=} opt_p_key primary key.
     * @param {*=} opt_value reference value.
     * @this {ydn.db.index.req.ICursor}
     */
    cursor.onSuccess = function(opt_key, opt_p_key, opt_value) {
      result_count++;
      if (!goog.isDefAndNotNull(opt_key)) {
        me.done_ = true;
      } else if (!cued) {
        var cmp = ydn.db.cmp(opt_key, me.keys_[i]);
        if (cmp === 1) {
          cued = true;
        } else if (cmp === -1) {
          cursor.continueEffectiveKey(me.keys_[i]);
        } else {
          if (goog.isDefAndNotNull(me.primary_keys_[i])) {
            goog.asserts.assert(opt_p_key);
            var cmp2 = ydn.db.cmp(opt_p_key, me.primary_keys_[i]);
            if (cmp2 === 1) {
              cued = true;
            } else if (cmp2 === -1) {
              cursor.continuePrimaryKey(me.primary_keys_[i]);
            } else {
              cursor.advance(1);
            }
          } else {
            cursor.advance(1);
          }
        }
      }
      me.keys_[i] = opt_key;
      me.primary_keys_[i] = opt_p_key;
      me.values_[i] = opt_value;
      if (result_count == n) {
        me.count_++;
        if (me.done_) {
          me.onNext();
          me.finalize_();
        } else {
          me.onNext(me.keys_[0]);
        }
        result_count = 0;
      }
    };
    /**
     * On error handler.
     * @param {!Error} e error.
     * @this {ydn.db.index.req.ICursor}
     */
    cursor.onError = function(e) {
      me.onFail(e);
      me.finalize_();
      me.done_ = true;
      result_count = 0;
    };

    cursor.openCursor(me.keys_[i], me.primary_keys_[i]);
  };
  for (var i = 0; i < n; i++) {
    listenCursor(i);
  }
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} effective key of cursor.
 */
ydn.db.Cursor.prototype.getKey = function(opt_idx) {
  var index = opt_idx || 0;
  return this.keys_[index];
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {IDBKey|undefined} primary key of cursor.
 */
ydn.db.Cursor.prototype.getPrimaryKey = function(opt_idx) {
  var index = opt_idx || 0;
  return this.primary_keys_[index];
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {*} value.
 */
ydn.db.Cursor.prototype.getValue = function(opt_idx) {
  var index = opt_idx || 0;
  return this.values_[index];
};


/**
 * Restart the cursor. If previous cursor position is given,
 * the position is skip.
 * @param {IDBKey=} opt_key previous position.
 * @param {IDBKey=} opt_primary_key primary key.
 */
ydn.db.Cursor.prototype.restart = function(opt_key, opt_primary_key) {
  this.cursors_[0].restart(opt_primary_key, opt_key);
};


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey=} opt_key primary key position to continue.
 */
ydn.db.Cursor.prototype.continuePrimaryKey = function(opt_key) {
  this.cursors_[0].continuePrimaryKey(opt_key);
};


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} opt_key effective key position to continue.
 */
ydn.db.Cursor.prototype.continueEffectiveKey = function(opt_key) {
  this.cursors_[0].continueEffectiveKey(opt_key);
};


/**
 * Move cursor position to the effective key.
 * @param {number} n number of steps.
 */
ydn.db.Cursor.prototype.advance = function(n) {
  this.cursors_[0].advance(n);
};


/**
 * @param {!Object} obj record value.
 * @param {number=} opt_idx cursor index.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.Cursor.prototype.update = function(obj, opt_idx) {
  var index = opt_idx || 0;
  return this.cursors_[index].update(obj);
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.Cursor.prototype.clear = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cursors_[index].clear();
};


/**
 * This method is overridden by cursor consumer.
 * @param {IDBKey=} opt_key effective key.
 */
ydn.db.Cursor.prototype.onNext = function(opt_key) {
  throw new ydn.debug.error.InternalError();
};


/**
 * This method is overridden by cursor consumer.
 * @param {!Error} e error.
 */
ydn.db.Cursor.prototype.onFail = function(e) {
  throw new ydn.debug.error.InternalError();
};


/**
 *
 * @return {boolean} true if cursor gone.
 */
ydn.db.Cursor.prototype.hasDone = function() {
  return this.done_;
};


/**
 *
 * @return {boolean} true if iteration is existed.
 */
ydn.db.Cursor.prototype.isExited = function() {
  return this.exited_;
};


/**
 * Exit cursor
 */
ydn.db.Cursor.prototype.exit = function() {
  this.exited_ = true;
  this.finalize_();
  this.logger.finest(this + ': exit');
};


/**
 *  Copy keys from cursors before dispose them and dispose cursors and
 *  its reference value. Keys are used to resume cursors position.
 * @private
 */
ydn.db.Cursor.prototype.finalize_ = function() {

  // IndexedDB will GC array keys, so we clone it.
  this.primary_keys_ = goog.array.map(this.primary_keys_, function(x) {
    if (goog.isDefAndNotNull(x)) {
      return ydn.db.Key.clone(x);
    } else {
      return undefined;
    }
  });
  this.keys_ = goog.array.map(this.keys_, function(x) {
    if (goog.isDefAndNotNull(x)) {
      return ydn.db.Key.clone(x);
    } else {
      return undefined;
    }
  });

  for (var i = 0; i < this.cursors_.length; i++) {
    this.cursors_[i].dispose();
  }
  goog.array.clear(this.values_);
  goog.array.clear(this.cursors_);
};

// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Cursor for IndexedDB.
 */


goog.provide('ydn.db.core.req.IDBCursor');
goog.require('ydn.db.core.req.AbstractCursor');
goog.require('ydn.debug.error.InternalError');



/**
 * Open an index. This will resume depending on the cursor state.
 * @param {ydn.db.con.IDatabase.Transaction} tx
 * @param {string} tx_no tx no.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index.
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec.
 * @param {boolean} key_only mode.
 * @param {ydn.db.schema.Store.QueryMethod} q_mth true for keys query method.
 * @extends {ydn.db.core.req.AbstractCursor}
 * @implements {ydn.db.core.req.ICursor}
 * @constructor
 */
ydn.db.core.req.IDBCursor = function(tx, tx_no,
    store_name, index_name, keyRange, direction, key_only, q_mth) {

  goog.base(this, tx, tx_no, store_name, index_name,
      keyRange, direction, key_only, q_mth);

  this.request_ = null;

};
goog.inherits(ydn.db.core.req.IDBCursor, ydn.db.core.req.AbstractCursor);


/**
 * @define {boolean} debug flag.
 */
ydn.db.core.req.IDBCursor.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.IDBCursor.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.req.IDBCursor');


/**
 *
 * @param {Event} ev event.
 */
ydn.db.core.req.IDBCursor.prototype.defaultOnSuccess = function(ev) {
  var cursor = ev.target.result;
  if (ydn.db.core.req.IDBCursor.DEBUG) {
    window.console.log(this + ' onSuccess ' + (cursor ?
        cursor.key + ', ' + cursor.primaryKey : ''));
  }
  if (cursor) {
    var p_key = this.isIndexCursor() ? cursor.primaryKey : undefined;
    this.onSuccess(cursor.key, p_key, cursor.value);
  } else {
    this.onSuccess();
  }

};


/**
 * @type {IDBRequest} cursor request object.
 * @private
 */
ydn.db.core.req.IDBCursor.prototype.request_ = null;


/**
 * @inheritDoc
 */
ydn.db.core.req.IDBCursor.prototype.openCursor = function(key, primary_key) {

  var msg = this + ' opening ';
  if (goog.isDefAndNotNull(key)) {
    msg += '{' + key;
    if (goog.isDefAndNotNull(primary_key)) {
      msg += ';' + primary_key + '}';
    } else {
      msg += '}';
    }
  }
  this.logger.finest(msg);

  var key_range = this.key_range;
  var obj_store = this.tx.objectStore(this.store_name);
  var index = goog.isString(this.index_name) ?
      obj_store.index(this.index_name) : null;

  var request;
  if (!this.isValueCursor()) {
    if (index) {
      if (goog.isDefAndNotNull(this.dir)) {
        request = index.openKeyCursor(key_range, this.dir);
      } else if (goog.isDefAndNotNull(key_range)) {
        request = index.openKeyCursor(key_range);
      } else {
        request = index.openKeyCursor();
      }
    } else {
      //throw new ydn.error.InvalidOperationException(
      //    'object store cannot open for key cursor');
      // IDB v1 spec do not have openKeyCursor, hopefully next version does
      // http://lists.w3.org/Archives/Public/public-webapps/2012OctDec/0466.html
      // however, lazy serailization used at least in FF.
      if (goog.isDefAndNotNull(this.dir)) {
        request = obj_store.openCursor(key_range, this.dir);
      } else if (goog.isDefAndNotNull(key_range)) {
        request = obj_store.openCursor(key_range);
        // some browser have problem with null, even though spec said OK.
      } else {
        request = obj_store.openCursor();
      }

    }
  } else {
    if (index) {
      if (goog.isDefAndNotNull(this.dir)) {
        request = index.openCursor(key_range, this.dir);
      } else if (goog.isDefAndNotNull(key_range)) {
        request = index.openCursor(key_range);
      } else {
        request = index.openCursor();
      }
    } else {
      if (goog.isDefAndNotNull(this.dir)) {
        request = obj_store.openCursor(key_range, this.dir);
      } else if (goog.isDefAndNotNull(key_range)) {
        request = obj_store.openCursor(key_range);
        // some browser have problem with null, even though spec said OK.
      } else {
        request = obj_store.openCursor();
      }
    }
  }

  var me = this;
  request.onerror = function(ev) {
    var err = request.error;
    me.onError(err);
  };

  /**
   *
   * @param {IDBKey=} key
   * @param {IDBKey=} primaryKey
   * @param {*=} value
   */
  var requestReady = function(key, primaryKey, value) {
    me.request_ = request;
    var p_key = me.isIndexCursor() ? primaryKey : undefined;
    if (ydn.db.core.req.IDBCursor.DEBUG) {
      window.console.log(me + ' onSuccess ' + key);
    }
    me.onSuccess(key, p_key, value);
    if (me.request_) {
      me.request_.onsuccess = goog.bind(me.defaultOnSuccess, me);
    }
    request = null;
  };

  if (goog.isDefAndNotNull(key)) {
    // start position is given, cursor must open after this position.
    request.onsuccess = function(ev) {
      var cursor = ev.target.result;
      if (cursor) {
        var cmp = ydn.db.con.IndexedDb.indexedDb.cmp(cursor.key, key);
        var dir = me.reverse ? -1 : 1;
        if (cmp == dir) {
          requestReady(cursor.key, cursor.primaryKey, cursor.value);
        } else if (cmp == (-dir)) {
          cursor['continue'](key);
        } else {
          if (goog.isDefAndNotNull(primary_key)) {
            var cmp2 = ydn.db.con.IndexedDb.indexedDb.cmp(
                cursor.primaryKey, primary_key);
            if (cmp2 == dir) {
              requestReady(cursor.key, cursor.primaryKey, cursor.value);
            } else {
              cursor['continue']();
            }
          } else {
            cursor['continue']();
          }
        }
      } else {
        requestReady();
      }
    };
  } else {
    me.request_ = request;
    me.request_.onsuccess = goog.bind(me.defaultOnSuccess, me);
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IDBCursor.prototype.hasCursor = function() {
  return !!this.request_;
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IDBCursor.prototype.update = function(record) {
  var cursor = this.request_.result;
  if (cursor) {
    var df = new goog.async.Deferred();
    var req = cursor.update(record);
    req.onsuccess = function(x) {
      df.callback(x.target.result);
    };
    req.onerror = function(e) {
      df.errback(e);
    };
    return df;
  } else {
    throw new ydn.db.InvalidAccessError('cursor gone');
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IDBCursor.prototype.clear = function() {

  var cursor = this.request_.result;
  if (cursor) {
    var df = new goog.async.Deferred();
    var req = cursor['delete']();
    req.onsuccess = function(x) {
      df.callback(1);
    };
    req.onerror = function(e) {
      df.errback(e);
    };
    return df;
  } else {
    throw new ydn.db.InvalidAccessError('cursor gone');
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IDBCursor.prototype.restart = function(
    effective_key, primary_key) {
  this.logger.finest(this + ' restarting.');
  this.openCursor(primary_key, effective_key);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IDBCursor.prototype.advance = function(step) {
  var cursor = this.request_.result;

  if (step == 1) {
    //some browser, like mobile chrome does not implement cursor advance method.
    cursor['continue']();
  } else {
    cursor.advance(step);
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IDBCursor.prototype.continuePrimaryKey = function(key) {

  var cursor = this.request_.result;

  if (goog.DEBUG) {
    var cmp = ydn.db.con.IndexedDb.indexedDb.cmp(key, cursor.primaryKey);
    if (cmp != 1) { // key must higher than primary key
      throw new ydn.debug.error.InternalError('continuing primary key "' + key +
          '" must higher than current primary key "' + cursor.primaryKey + '"');
    }
  }

  var me = this;
  this.request_.onsuccess = function(ev) {
    cursor = ev.target.result;
    if (cursor) {
      cmp = ydn.db.con.IndexedDb.indexedDb.cmp(cursor.primaryKey, key);
      if (cmp == 0 ||
          (cmp == 1 && !me.reverse) ||
          (cmp == -1 && me.reverse)) {
        me.request_.onsuccess = goog.bind(me.defaultOnSuccess, me);
        var p_key = me.isIndexCursor() ? cursor.primaryKey : undefined;
        me.onSuccess(cursor.key, p_key, cursor.value);
      } else {
        cursor['continue'](); // take another step.
      }
    } else {
      me.request_.onsuccess = goog.bind(me.defaultOnSuccess, me);
      me.onSuccess();
    }
  };
  cursor['continue'](); // take one step.
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IDBCursor.prototype.continueEffectiveKey = function(key) {
  var cursor = this.request_.result;
  if (goog.isDefAndNotNull(key)) {
    // it is an DataError for undefined or null key.
    // this behaviour is reasonable, somehow it is not.
    cursor['continue'](key);
  } else {
    cursor['continue']();
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IDBCursor.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
  this.request_ = null;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.core.req.IDBCursor.prototype.toString = function() {
    return 'IDB' + goog.base(this, 'toString');
  };
}



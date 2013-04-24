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
 * @fileoverview Implements ydn.db.io.QueryService with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.algo.AbstractSolver');
goog.require('ydn.db.core.req.IDBCursor');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.crud.req.IndexedDb');
goog.require('ydn.error');
goog.require('ydn.json');



/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 * @extends {ydn.db.crud.req.IndexedDb}
 * @struct
 */
ydn.db.core.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.IndexedDb, ydn.db.crud.req.IndexedDb);


/**
 *
 * @define {boolean} turn on debug flag to dump object.
 */
ydn.db.core.req.IndexedDb.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.IndexedDb.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.req.IndexedDb');


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.keysByIterator = function(tx, tx_no, df,
    iter, limit, offset) {
  this.iterate_(ydn.db.schema.Store.QueryMethod.KEYS, tx, tx_no, df, iter,
      limit, offset);
};


/**
 * List record in a store.
 * @param {ydn.db.schema.Store.QueryMethod} mth keys method.
 * @param {ydn.db.con.IDatabase.Transaction} tx
 * @param {string} tx_no transaction number.
 * @param {?function(*, boolean=)} df key in deferred function.
 * @param {!ydn.db.Iterator} iter iterator.
 * @param {number=} opt_limit limit.
 * @param {number=} opt_offset limit.
 * @private
 */
ydn.db.core.req.IndexedDb.prototype.iterate_ = function(mth, tx, tx_no, df,
    iter, opt_limit, opt_offset) {
  var arr = [];

  var is_keys = mth == ydn.db.schema.Store.QueryMethod.KEYS;
  var q = is_keys ? 'keys' :
      mth == ydn.db.schema.Store.QueryMethod.VALUES ? 'values' :
          mth == ydn.db.schema.Store.QueryMethod.COUNT ? 'count' : '';
  var msg = tx_no + ' ' + q + 'ByIterator ' + iter;
  if (opt_limit > 0) {
    msg += ' limit ' + opt_limit;
  }
  var me = this;
  this.logger.finer(msg);
  var cursor = iter.iterate(tx, tx_no, this, mth);
  cursor.onFail = function(e) {
    me.logger.finer('error:' + msg);
    cursor.exit();
    df(e, true);
  };
  var count = 0;
  var cued = false;
  var displayed = false;
  /**
   * @param {IDBKey=} opt_key
   */
  cursor.onNext = function(opt_key) {
    if (!displayed) {
      me.logger.finest(msg + ' starting');
      displayed = true;
    }
    if (goog.isDefAndNotNull(opt_key)) {
      var primary_key = iter.isIndexIterator() ?
          cursor.getPrimaryKey() : opt_key;
      if (!cued && opt_offset > 0) {
        cursor.advance(opt_offset);
        cued = true;
        return;
      }
      count++;
      if (is_keys) {
        arr.push(opt_key);
      } else {
        arr.push(iter.isKeyIterator() ? primary_key : cursor.getValue());
      }
      if (!goog.isDef(opt_limit) || count < opt_limit) {
        cursor.continueEffectiveKey();
      } else {
        me.logger.finer('success:' + msg + ' ' + arr.length + ' records');
        cursor.exit();
        df(arr);
      }
    } else {
      me.logger.finer('success:' + msg + ' ' + arr.length + ' records');
      cursor.exit();
      df(arr);
    }
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.listByIterator = function(tx, tx_no, df,
    iter, limit, offset) {
  this.iterate_(ydn.db.schema.Store.QueryMethod.VALUES, tx, tx_no, df, iter,
      limit, offset);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.getCursor = function(tx, tx_no,
        store_name, index_name, keyRange, direction, key_only, key_query) {

  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store, 'store "' + store_name + '" not found.');
  if (goog.isDef(index_name)) {
    index_name = this.getIndexName(store, index_name);
  }

  return new ydn.db.core.req.IDBCursor(tx, tx_no, store_name, index_name,
      keyRange, direction, key_only, key_query);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.getStreamer = function(tx, tx_no,
    store_name, index_name) {
  return new ydn.db.Streamer(tx, store_name, index_name);
};

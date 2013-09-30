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
 * @fileoverview WebSQL executor.
 *
 * @see http://www.w3.org/TR/webdatabase/
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.req.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('ydn.db.core.req.CachedWebsqlCursor');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.core.req.WebsqlCursor');
goog.require('ydn.db.crud.req.WebSql');
goog.require('ydn.json');



/**
 * @extends {ydn.db.crud.req.WebSql}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.core.req.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.WebSql, ydn.db.crud.req.WebSql);


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.core.req.WebSql.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.WebSql.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.req.WebSql');


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.keysByIterator = function(rq, iter,
                                                           limit, offset) {
  this.fetchIterator_(rq, iter, ydn.db.base.SqlQueryMethod.KEYS,
      limit, offset);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.getByIterator = function(rq, iter) {
  this.fetchIterator_(rq, iter, ydn.db.base.SqlQueryMethod.GET, 1, 0);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.listByIterator = function(rq, q,
                                                           limit, offset) {

  this.fetchIterator_(rq, q, ydn.db.base.SqlQueryMethod.VALUES,
      limit, offset);

};


/**
 * @param {ydn.db.Request} rq request.
 * @param {!ydn.db.Iterator} iter the query.
 * @param {ydn.db.base.SqlQueryMethod} mth query method.
 * @param {number=} opt_limit override limit.
 * @param {number=} opt_offset offset.
 * @private
 */
ydn.db.core.req.WebSql.prototype.fetchIterator_ = function(rq, iter,
    mth, opt_limit, opt_offset) {

  var tx = rq.getTx();
  var tx_no = rq.getLabel();
  var arr = [];
  //var req = this.openQuery_(q, ydn.db.base.CursorMode.KEY_ONLY);
  var q = mth == ydn.db.base.SqlQueryMethod.KEYS ? 'keys' :
      mth == ydn.db.base.SqlQueryMethod.VALUES ? 'values' :
      mth == ydn.db.base.SqlQueryMethod.COUNT ? 'count' : '';
  var msg = tx_no + ' ' + q + 'ByIterator ' + iter;
  if (opt_limit > 0) {
    msg += ' limit ' + opt_limit;
  }
  var me = this;
  this.logger.finer(msg);
  var cursor = this.getCursor(tx, tx_no, iter.getStoreName(), mth);
  iter.load(cursor);
  cursor.onFail = function(e) {
    cursor.exit();
    rq.setDbValue(e, true);
  };
  var count = 0;
  var cued = false;
  /**
   * @param {IDBKey=} opt_key key.
   */
  cursor.onNext = function(opt_key) {
    if (goog.isDef(opt_key)) {
      var key = opt_key;
      var primary_key = cursor.getPrimaryKey();
      // console.log([key, primary_key]);
      var value = cursor.getValue();
      if (!cued && opt_offset > 0) {
        cursor.advance(opt_offset);
        cued = true;
        return;
      }
      count++;
      var out;
      if (mth == ydn.db.base.SqlQueryMethod.KEYS) {
        out = key;
      } else {           // call by values() method
        if (iter.isIndexIterator() && iter.isKeyIterator()) {
          out = primary_key;
        } else {
          out = value;
        }
      }
      arr.push(out);
      if (!goog.isDef(opt_limit) || count < opt_limit) {
        cursor.continueEffectiveKey();
      } else {
        cursor.exit();
        me.logger.finer('success:' + msg + ' ' + arr.length + ' records');
        var rs = ydn.db.base.SqlQueryMethod.GET == mth ? arr[0] : arr;
        rq.setDbValue(rs);
      }
    } else {
      cursor.exit();
      me.logger.finer('success:' + msg + ' ' + arr.length + ' records');
      var rs = ydn.db.base.SqlQueryMethod.GET == mth ? arr[0] : arr;
      rq.setDbValue(rs);
    }
  };
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.getCursor = function(tx, tx_no, store_name,
                                                      mth) {

  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store, 'store "' + store_name + '" not found.');
  return new ydn.db.core.req.WebsqlCursor(tx, tx_no, store, mth);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.getStreamer = function(tx, tx_no,
    store_name, index_name) {
  throw 'not yet';
};



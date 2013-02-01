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
goog.require('ydn.async');
goog.require('ydn.db.req.RequestExecutor');
goog.require('ydn.json');
goog.require('ydn.db.Where');
goog.require('ydn.db.core.req.IRequestExecutor');


/**
 * @extends {ydn.db.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.core.req.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.WebSql, ydn.db.req.RequestExecutor);


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.core.req.WebSql.DEBUG = false;


/**
 * Maximum number of readonly requests created per transaction.
 * Common implementation in WebSQL library is sending massive requests
 * to the transaction and use setTimeout to prevent breaking the system.
 * To get optimal performance, we send limited number of request per
 * transaction.
 * Sending more request will not help much because JS is just parsing and
 * pushing to result array data which is faster than SQL processing.
 * Smaller number also help SQLite engine to give
 * other transaction to perform parallel requests.
 * @const
 * @type {number} Maximum number of readonly requests created per transaction.
 */
ydn.db.core.req.WebSql.REQ_PER_TX = 10;


/**
 * Maximum number of read-write requests created per transaction.
 * Since SQLite locks all stores during read write request, it is better
 * to give this number smaller. Larger number will not help to get faster
 * because it bottleneck is in SQL engine, not from JS side.
 * @const
 * @type {number} Maximum number of read-write requests created per transaction.
 */
ydn.db.core.req.WebSql.RW_REQ_PER_TX = 2;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.WebSql.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.core.req.WebSql');


/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @final
 * @param {!Object} row row.
 * @param {ydn.db.schema.Store} store store schema.
 * @return {!Object} parse value.
 */
ydn.db.core.req.WebSql.parseRow = function(row, store) {

  var value = row[ydn.db.base.DEFAULT_BLOB_COLUMN] ?
      ydn.json.parse(row[ydn.db.base.DEFAULT_BLOB_COLUMN]) : {};
  if (goog.isDefAndNotNull(store.keyPath)) {
    var key = ydn.db.schema.Index.sql2js(row[store.keyPath], store.type);
    if (goog.isDefAndNotNull(key)) {
      store.setKeyValue(value, key);
    }
  }
  for (var j = 0; j < store.indexes.length; j++) {
    var index = store.indexes[j];
    if (index.name == ydn.db.base.DEFAULT_BLOB_COLUMN) {
      continue;
    }
    var x = row[index.name];
    var v;
    if (index.isMultiEntry()) {
      v = ydn.db.schema.Index.sql2js(x, [index.type]);
    } else {
      v = ydn.db.schema.Index.sql2js(x, index.type);
    }
    if (goog.isDef(v)) {
      value[index.name] = v;
    }
  }
  return value;
};


/**
 * @protected
 * @return {SQLTransaction} transaction object.
 */
ydn.db.core.req.WebSql.prototype.getTx = function() {
  return /** @type {SQLTransaction} */ (this.tx);
};



/**
 * Extract key from row result.
 * @final
 * @protected
 * @param {ydn.db.schema.Store} table table of concern.
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.core.req.WebSql.prototype.getKeyFromRow = function(table, row) {
  return row[table.keyPath || ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
};




/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.keysByKeyRange = function(df, store_name,
        key_range, reverse, limit, offset) {
  this.list_by_key_range_(df, true, store_name, undefined, key_range, reverse, limit, offset, false);
};



/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.keysByIndexKeyRange = function(df, store_name,
      index_name, key_range, reverse, limit, offset, unique) {
  this.list_by_key_range_(df, true, store_name, index_name, key_range, reverse, limit, offset, unique);
};


/**
 * Retrieve primary keys or value from a store in a given key range.
 * @param {!goog.async.Deferred} df return object in deferred function.
 * @param {boolean} key_only retrieve key only.
 * @param {string} store_name table name.
 * @param {string|undefined} index_column name.
 * @param {IDBKeyRange} key_range to retrieve.
 * @param {boolean} reverse ordering.
 * @param {number} limit the results.
 * @param {number} offset skip first results.
 * @param {boolean} distinct
 * @private
 */
ydn.db.core.req.WebSql.prototype.list_by_key_range_ = function(df, key_only,
      store_name, index_column, key_range, reverse, limit, offset, distinct) {

  var me = this;
  var arr = [];
  var store = this.schema.getStore(store_name);

  var is_index = !goog.isDef(index_column);
  var column = index_column || store.getColumnName();

  var qcolumn = goog.string.quote(column);
  var key_column = store.getColumnName();
  var fields = '*';
  if (is_index) {
    if (key_only) {
      fields = goog.string.quote(key_column);
    } else {
      fields = qcolumn;
    }
  } else {
    if (key_only) {
      fields = goog.string.quote(key_column);
    }
  }
  var dist = distinct ? 'DISTINCT' : '';
  var sql = 'SELECT ' + dist + fields +
    ' FROM ' + store.getQuotedName();
  var params = [];
  if (!goog.isNull(key_range)) {
    var where_clause = ydn.db.Where.toWhereClause(column, store.getType(), key_range);
    sql += ' WHERE ' + where_clause.sql;
    params = where_clause.params;
  }

  var order = reverse ? 'DESC' : 'ASC';
  sql += ' ORDER BY ' + qcolumn + ' ' + order;

  if (goog.isNumber(limit)) {
    sql += ' LIMIT ' + limit;
  }
  if (goog.isNumber(offset)) {
    sql += ' OFFSET ' + offset;
  }

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    for (var i = 0, n = results.rows.length; i < n; i++) {
      var row = results.rows.item(i);
      if (key_only) {
        arr[i] = ydn.db.schema.Index.sql2js(row[key_column], store.getType());
      } else if (goog.isDefAndNotNull(row)) {
        arr[i] = ydn.db.core.req.WebSql.parseRow(row, store);
      }
    }
    me.logger.finest('success ' + sql);
    df.callback(arr);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.core.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + sql + ' ' + error.message);
    df.errback(error);
    return true; // roll back
  };

  this.logger.finest('SQL: ' + sql + ' PARAMS: ' + params);
  this.tx.executeSql(sql, params, callback, error_callback);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.keysByStore =  function(df, store_name,
     reverse, limit, offset) {
  this.list_by_key_range_(df, true, store_name, undefined, null, reverse, limit, offset, false);
};



/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.putByKeys = goog.abstractMethod;



/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.addObject = function(
    df, store_name, obj, opt_key) {
  this.insertObjects(df, true, true, store_name, [obj], [opt_key]);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.putData = goog.abstractMethod;


/**
* @inheritDoc
*/
ydn.db.core.req.WebSql.prototype.putObject = function(df,
                                store_name, obj, opt_key) {
  this.insertObjects(df, false, true, store_name, [obj], [opt_key]);
};



/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.addObjects = function(
    df, store_name, objects, opt_keys) {
  this.insertObjects(df, true, false, store_name, objects, opt_keys);
};



/**
 * @param {goog.async.Deferred} df  promise.
 * @param {boolean} create true if insert, otherwise insert or replace.
 * @param {boolean} single false for array input.
 * @param {string} store_name table name.
 * @param {!Array.<!Object>} objects object to put.
 * @param {!Array.<(!Array|string|number)>=} opt_keys optional out-of-line keys.
 * @private
*/
ydn.db.core.req.WebSql.prototype.insertObjects = function(
  df, create, single, store_name, objects, opt_keys) {

  var table = this.schema.getStore(store_name);

  var insert_statement = create ? 'INSERT INTO ' : 'INSERT OR REPLACE INTO ';

  var me = this;
  var result_keys = [];
  var result_count = 0;

  /**
   * Put and item at i. This ydn.db.con.Storage will invoke callback to df if
   * all objects
   * have been put, otherwise recursive call to itself at next i+1 item.
   * @param {number} i index.
   * @param {SQLTransaction} tx transaction.
   */
  var put = function(i, tx) {

    // todo: handle undefined or null object

    var out;
    if (goog.isDef(opt_keys)) {
      out = table.getIndexedValues(objects[i], opt_keys[i]);
    } else {
      out = table.getIndexedValues(objects[i]);
    }
    //console.log([obj, JSON.stringify(obj)]);

    var sql = insert_statement + table.getQuotedName() +
        ' (' + out.columns.join(', ') + ') ' +
        'VALUES (' + out.slots.join(', ') + ');';

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function(transaction, results) {
      result_count++;

      var key = goog.isDef(out.key) ? out.key : results.insertId;
      if (single) {
        me.logger.finest('success ' + sql);
        df.callback(key);
      } else {
        result_keys[i] = key;
        if (result_count == objects.length) {
          me.logger.finest('success ' + sql);
          df.callback(result_keys);
        } else {
          var next = i + ydn.db.core.req.WebSql.RW_REQ_PER_TX;
          if (next < objects.length) {
            put(next, transaction);
          }
        }
      }

    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.core.req.WebSql.DEBUG) {
        window.console.log([sql, out, tr, error]);
      }
      me.logger.warning('error: ' + sql + ' ' + error.message);
      df.errback(error);
      return true; // roll back
    };

    //console.log([sql, out.values]);
    me.logger.finest('SQL: ' + sql + ' PARAMS: ' + out.values);
    tx.executeSql(sql, out.values, success_callback, error_callback);
  };

  if (objects.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.core.req.WebSql.RW_REQ_PER_TX && i < objects.length;
         i++) {
      put(i, this.getTx());
    }
  } else {
    this.logger.finest('success');
    df.callback([]);
  }
};



/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.putObjects = function(
  df, store_name, objects, opt_keys) {
    this.insertObjects(df, false, false, store_name, objects, opt_keys);
};


/**
*
* @param {goog.async.Deferred} d  promise.
* @param {string} table_name store name.
* @param {(string|number|Date|!Array)} id id.
*/
ydn.db.core.req.WebSql.prototype.getById = function(d, table_name, id) {

  var table = this.schema.getStore(table_name);
  goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
    ' not found.');

  var me = this;

  var column_name = table.getSQLKeyColumnName();

  var params = [ydn.db.schema.Index.js2sql(id, table.type)];

  var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
    column_name + ' = ?';

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    me.logger.finest('success ' + sql);
    if (results.rows.length > 0) {
      var row = results.rows.item(0);

      if (goog.isDefAndNotNull(row)) {
        var value = ydn.db.core.req.WebSql.parseRow(row, table);
        d.callback(value);
      } else {
        d.callback(undefined);
      }
    } else {
      d.callback(undefined);
    }
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.core.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + sql + ' ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  //window.console.log(['getById', sql, params]);
  this.logger.finest('SQL: ' + sql + ' PARAMS: ' + params);
  this.tx.executeSql(sql, params, callback, error_callback);
};


/**
 *
 * @param {goog.async.Deferred} df promise.
 * @param {string} table_name store name.
 * @param {!Array.<(!Array|number|string)>} ids ids.
 */
ydn.db.core.req.WebSql.prototype.listByIds = function(df, table_name, ids) {

  var me = this;
  var objects = [];
  var result_count = 0;

  var table = this.schema.getStore(table_name);
  goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
    ' not found.');

  /**
   * Get fetch the given id of i position and put to results array in
   * i position. If req_done are all true, df will be invoked, if not
   * it recursively call itself to next sequence.
   * @param {number} i the index of ids.
   * @param {SQLTransaction} tx tx.
   */
  var get = function(i, tx) {

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      result_count++;
      if (results.rows.length > 0) {
        var row = results.rows.item(0);
        if (goog.isDefAndNotNull(row)) {
          objects[i] = ydn.db.core.req.WebSql.parseRow(row, table);
        }
        // this is get function, we take only one result.
      } else {
        objects[i] = undefined; // not necessary.
      }

      if (result_count == ids.length) {
        me.logger.finest('success ' + sql);
        df.callback(objects);
      } else {
        var next = i + ydn.db.core.req.WebSql.REQ_PER_TX;
        if (next < ids.length) {
          get(next, transaction);
        }
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.core.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('error: ' + sql + ' ' + error.message);
      // t.abort(); there is no abort
      df.errback(error);
      return true; // roll back
    };

    var id = ids[i];
    var column_name = table.getSQLKeyColumnName();

    var params = [ydn.db.schema.Index.js2sql(id, table.type)];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
      column_name + ' = ?';
    me.logger.finest('SQL: ' + sql + ' PARAMS: ' + params);
    tx.executeSql(sql, params, callback, error_callback);
  };

  if (ids.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.core.req.WebSql.REQ_PER_TX && i < ids.length; i++) {
      get(i, this.getTx());
    }
  } else {
    me.logger.finest('success');
    df.callback([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.listByKeyRange = function(df, store_name,
   key_range, reverse, limit, offset) {

  this.list_by_key_range_(df, false, store_name, undefined, key_range, reverse, limit, offset, false);
};

/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.listByIndexKeyRange = function(df, store_name,
          index, key_range, reverse, limit, offset, unqiue) {
  this.list_by_key_range_(df, false, store_name, index, key_range, reverse, limit, offset, unqiue)
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.listByStore = function(df, store_name,
       reverse, limit, offset) {
  this.list_by_key_range_(df, false, store_name, undefined, null, reverse, limit, offset, false);
};


/**
* @inheritDoc
*/
ydn.db.core.req.WebSql.prototype.listByStores = function(df, table_names) {

  var me = this;
  var arr = [];

  var n_todo = table_names.length;

  /**
   * @param {number} idx the index of table_names.
   * @param {SQLTransaction} tx tx.
   */
  var getAll = function(idx, tx) {
    var table_name = table_names[idx];
    var table = me.schema.getStore(table_name);
    goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
      ' not found.');

    var sql = 'SELECT * FROM ' + table.getQuotedName();

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      for (var i = 0, n = results.rows.length; i < n; i++) {
        var row = results.rows.item(i);
        if (goog.isDefAndNotNull(row)) {
          arr.push(ydn.db.core.req.WebSql.parseRow(row, table));
        }
      }
      if (idx == n_todo - 1) {
        me.logger.finest('success ' + sql);
        df.callback(arr);
      } else {
        getAll(idx + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.core.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('error: ' + sql + ' ' + error.message);
      df.errback(error);
      return true; // roll back
    };

    me.logger.finest('SQL: ' + sql + ' PARAMS: []');
    tx.executeSql(sql, [], callback, error_callback);
  };

  // send request to the first store
  // getAll will continue to fetch one after another
  if (n_todo == 0) {
    me.logger.finest('success');
    df.callback([]);
  } else {
    getAll(0, this.getTx());
  }

};




/**
*
* @param {goog.async.Deferred} df promise.
* @param {!Array.<!ydn.db.Key>} keys keys.
*/
ydn.db.core.req.WebSql.prototype.listByKeys = function(df, keys) {

  var me = this;
  var objects = [];
  var result_count = 0;

  var get = function(i, tx) {
    var key = keys[i];
    var table_name = key.getStoreName();
    var table = me.schema.getStore(table_name);
    goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
      ' not found.');

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      result_count++;
      if (results.rows.length > 0) {
        var row = results.rows.item(0);
        if (goog.isDefAndNotNull(row)) {
          objects[i] = ydn.db.core.req.WebSql.parseRow(row, table);
        }
        // this is get function, we take only one result.
      } else {
        objects[i] = undefined; // not necessary.
      }

      if (result_count == keys.length) {
        me.logger.finest('success ' + sql);
        df.callback(objects);
      } else {
        var next = i + ydn.db.core.req.WebSql.REQ_PER_TX;
        if (next < keys.length) {
          get(next, transaction);
        }
      }

    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.core.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('error: ' + sql + ' ' + error.message);
      df.errback(error);
      return true; // roll back
    };

    var id = key.getNormalizedId();
    var column_name = table.getSQLKeyColumnName();

    var params = [id];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        table.getQuotedKeyPath() + ' = ?';
    me.logger.finest('SQL: ' + sql + ' PARAMS: ' + params);
    tx.executeSql(sql, params, callback, error_callback);

  };

  if (keys.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.core.req.WebSql.REQ_PER_TX && i < keys.length; i++) {
      get(i, this.getTx());
    }
  } else {
    this.logger.finest('success');
    df.callback([]);
  }
};



/**
* @inheritDoc
*/
ydn.db.core.req.WebSql.prototype.clearByStores = function(d, store_names) {

  var me = this;

  var deleteStore = function(i, tx) {

    var store = me.schema.getStore(store_names[i]);

    var sql = 'DELETE FROM  ' + store.getQuotedName();

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      if (i == store_names.length - 1) {
        me.logger.finest('success ' + sql);
        d.callback(store_names.length);
      } else {
        deleteStore(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.core.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('error: ' + sql + ' ' + error.message);
      d.errback(error);
      return true; // roll back
    };

    me.logger.finest('SQL: ' + sql + ' PARAMS: []');
    tx.executeSql(sql, [], callback, error_callback);

    return d;
  };

  if (store_names.length > 0) {
    deleteStore(0, this.tx);
  } else {
    this.logger.finest('success');
    d.callback(0);
  }
};


/**
* Deletes all objects from the store.
* @param {goog.async.Deferred} d promise.
* @param {string} table_name table name.
* @param {(string|number)} key table name.
*/
ydn.db.core.req.WebSql.prototype.removeById = function(d, table_name, key) {

  var me = this;
  var store = this.schema.getStore(table_name);
  var key_column = store.getSQLKeyColumnName();

  var sql = 'DELETE FROM  ' + store.getQuotedName() + ' WHERE ' +
      key_column + ' = ?';

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    me.logger.finest('success ' + sql);
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.core.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + sql + ' ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  this.logger.finest('SQL: ' + sql + ' PARAMS: ' + [key]);
  this.tx.executeSql(sql, [key], callback, error_callback);

};



/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.clearById = function(d, table, id) {


  var store = this.schema.getStore(table);
  var key = ydn.db.schema.Index.js2sql(id, store.getType());

  var me = this;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.core.req.WebSql.DEBUG) {
      window.console.log(results);
    }
    me.logger.finest('success ' + sql);
    d.callback(results.rowsAffected);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.core.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + sql + ' ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  var sql = 'DELETE FROM ' + store.getQuotedName() +
    ' WHERE ' + store.getQuotedKeyPath() + ' = ?';
  //console.log([sql, out.values])
  this.logger.finest('SQL: ' + sql + ' PARAMS: ' + [key]);
  this.tx.executeSql(sql, [key], success_callback, error_callback);

};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.clearByKeyRange = function(df, store_name, key_range) {
  this.clear_by_key_range_(df, store_name, undefined, key_range);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.clearByIndexKeyRange = function(df, store_name,
          index_name, key_range) {
  this.clear_by_key_range_(df, store_name, index_name, key_range);
};


/**
 * Retrieve primary keys or value from a store in a given key range.
 * @param {!goog.async.Deferred} df return object in deferred function.
 * @param {string} store_name table name.
 * @param {string|undefined} column name.
 * @param {IDBKeyRange} key_range to retrieve.
 * @private
 */
ydn.db.core.req.WebSql.prototype.clear_by_key_range_ = function(df,
                    store_name, column, key_range) {

  var me = this;
  var arr = [];
  var store = this.schema.getStore(store_name);

  var type = store.getType();
  if (goog.isDef(column)) {
    type = store.getIndex(column).getType();
  } else {
    column =  store.getColumnName();
  }

  var sql = 'DELETE FROM ' + store.getQuotedName();
  var params = [];
  if (!goog.isNull(key_range)) {
    var where_clause = ydn.db.Where.toWhereClause(column, type, key_range);
    sql += ' WHERE ' + where_clause.sql;
    params = where_clause.params;
  }

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    me.logger.finest('success ' + sql);
    df.callback(results.rowsAffected);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.core.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + sql + ' ' + error.message);
    df.errback(error);
    return true; // roll back
  };

  //console.log([sql, params])
  this.logger.finest('SQL: ' + sql + ' PARAMS: ' + params);
  this.tx.executeSql(sql, params, callback, error_callback);
};



/**
 * @param {!goog.async.Deferred} d return a deferred function.
 * @param {!Array.<string>} tables store name.
 * @return {!goog.async.Deferred} d return a deferred function. ??
*/
ydn.db.core.req.WebSql.prototype.countStores = function(d, tables) {

  var me = this;
  var out = [];

  /**
   *
   * @param {number} i
   */
  var count = function (i) {
    var table = tables[i];
    var sql = 'SELECT COUNT(*) FROM ' + goog.string.quote(table);

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function (transaction, results) {
      var row = results.rows.item(0);
      //console.log(['row ', row  , results]);
      out[i] = parseInt(row['COUNT(*)'], 10);
      i++;
      if (i == tables.length) {
        me.logger.finest('success ' + sql);
        d.callback(out);
      } else {
        count(i);
      }

    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function (tr, error) {
      if (ydn.db.core.req.WebSql.DEBUG) {
        window.console.log([tr, error]);
      }
      me.logger.warning('error: ' + sql + ' ' + error.message);
      d.errback(error);
      return true; // roll back
    };

    me.logger.finest('SQL: ' + sql + ' PARAMS: []');
    me.tx.executeSql(sql, [], callback, error_callback);
  };

  if (tables.length == 0) {
    this.logger.finest('success');
    d.callback(0);
  } else {
    count(0);
  }

  return d;
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.countKeyRange = function(d, table,
                                                          key_range, index_name) {

  var me = this;

  var sql = 'SELECT COUNT(*) FROM ' + goog.string.quote(table);
  var params = [];

  var store = this.schema.getStore(table);

  var column = index_name || store.getColumnName();

  if (!goog.isNull(key_range)) {
    var where_clause = ydn.db.Where.toWhereClause(column, store.getType(), key_range);
    sql += ' WHERE ' + where_clause.sql;
    params = where_clause.params;
  }
  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    var row = results.rows.item(0);
    //console.log(['row ', row  , results]);
    me.logger.finest('success ' + sql);
    d.callback(row['COUNT(*)']);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.core.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + sql + ' ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  this.logger.finest('SQL: ' + sql + ' PARAMS: ' + params);
  this.tx.executeSql(sql, params, callback, error_callback);

  return d;
};


/**
 * @param {!goog.async.Deferred} d return a deferred function.
 * @param {string=} opt_table table name to be deleted, if not specified all
 * tables will be deleted.
 */
ydn.db.core.req.WebSql.prototype.removeByStore = function(d, opt_table) {

  var me = this;

  var sql = '';
  if (goog.isDef(opt_table)) {
    var store = this.schema.getStore(opt_table);
    if (!store) {
      throw Error('Table ' + opt_table + ' not found.');
    }
    sql = sql + 'DROP TABLE ' + store.getQuotedName() + ';';
  } else {
    for (var i = 0; i < me.schema.stores.length; i++) {
      sql = sql + 'DROP TABLE ' + me.schema.stores[i].getQuotedName() + ';';
    }
  }


  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    //console.log(['row ', row  , results]);
    me.logger.finest('success ' + sql);
    d.callback(true);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.core.req.WebSql.DEBUG) {
      window.console.log([tr, error]);
    }
    me.logger.warning('error: ' + sql + ' ' + error.message);
    d.errback(error);
    return true; // roll back
  };

  this.logger.finest('SQL: ' + sql + ' PARAMS: []');
  this.tx.executeSql(sql, [], callback, error_callback);

};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebSql.prototype.getIndexKeysByKeys = goog.abstractMethod;


/**
 * @override
 */
ydn.db.core.req.WebSql.prototype.toString = function() {
  return 'WebSqlEx:' + (this.dbname || '');
};




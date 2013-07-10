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
* @fileoverview Provide atomic CRUD database operations on a transaction queue.
*
* @author kyawtun@yathit.com (Kyaw Tun)
*/


goog.provide('ydn.db.crud.DbOperator');
goog.require('goog.debug.Logger');
goog.require('ydn.db');
goog.require('ydn.db.Request');
goog.require('ydn.db.ISyncOperator');
goog.require('ydn.db.Key');
goog.require('ydn.db.crud.IOperator');
goog.require('ydn.db.tr.AtomicSerial');
goog.require('ydn.db.tr.DbOperator');
goog.require('ydn.db.tr.IThread');
goog.require('ydn.debug.error.ArgumentException');
goog.require('ydn.error.NotSupportedException');



/**
 * Construct storage to execute CRUD database operations.
 *
 * Execution database operation is atomic, if a new transaction require,
 * otherwise existing transaction is used and the operation become part of
 * the existing transaction. A new transaction is required if the transaction
 * is not active or locked. Active transaction can be locked by using
 * mutex.
 *
 * @param {!ydn.db.crud.Storage} storage base storage object.
 * @param {!ydn.db.schema.Database} schema schema.
 * @param {ydn.db.tr.IThread} tx_thread
 * @param {ydn.db.tr.IThread} sync_thread
 * @implements {ydn.db.crud.IOperator}
 * @implements {ydn.db.ISyncOperator}
 * @constructor
 * @extends {ydn.db.tr.DbOperator}
 * @struct
*/
ydn.db.crud.DbOperator = function(storage, schema, tx_thread, sync_thread) {
  goog.base(this, storage, schema, tx_thread, sync_thread);
};
goog.inherits(ydn.db.crud.DbOperator, ydn.db.tr.DbOperator);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.DbOperator.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.crud.DbOperator');


/**
 *
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.count = function(store_name, index_or_keyrange,
                                                 index_key_range, unique) {
  var req;
  var me = this;

  /**
   * @type {!Array.<string>}
   */
  var store_names;

  /**
   * @type {string}
   */
  var index_name;
  /**
   * @type {IDBKeyRange}
   */
  var key_range;

  if (!goog.isDefAndNotNull(store_name)) {
    throw new ydn.debug.error.ArgumentException('store name required');
  } else if (goog.isArray(store_name)) {

    if (goog.isDef(index_key_range) || goog.isDef(index_or_keyrange)) {
      throw new ydn.debug.error.ArgumentException('too many arguments.');
    }

    store_names = store_name;
    for (var i = 0; i < store_names.length; i++) {
      if (!this.schema.hasStore(store_names[i])) {
        throw new ydn.debug.error.ArgumentException('store name "' +
            store_names[i] + '" at ' + i + ' not found.');
      }
    }

    //console.log('waiting to count');
    this.logger.finer('countStores: ' + ydn.json.stringify(store_names));
    req = this.tx_thread.request(ydn.db.Request.Method.COUNT, store_names);
    req.addTxback(function(tx, tx_no, cb) {
      //console.log('counting');
      this.getExecutor().countStores(req, store_names);
    }, this);
  } else if (goog.isString(store_name)) {
    var store = this.schema.getStore(store_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store name "' + store_name +
          '" not found.');
    }
    if (goog.DEBUG && goog.isDef(unique) && !goog.isBoolean(unique)) {
      throw new TypeError('unique value "' + unique +
          '" must be boolean, but found ' + typeof unique + '.');
    }
    store_names = [store_name];

    if (goog.isString(index_or_keyrange)) {
      // index key range count.
      index_name = index_or_keyrange;

      if (goog.isObject(index_key_range)) {
        if (goog.DEBUG) {
          var msg1 = ydn.db.KeyRange.validate(index_key_range);
          if (msg1) {
            throw new ydn.debug.error.ArgumentException('invalid key range: ' +
                ydn.json.toShortString(index_key_range) + ' ' + msg1);
          }
        }
        key_range = ydn.db.KeyRange.parseIDBKeyRange(index_key_range);
      } else {
        if (goog.DEBUG && goog.isDefAndNotNull(index_key_range)) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
              ydn.json.toShortString(index_key_range) +
              ' of type ' + typeof index_key_range);
        }
        key_range = null;
      }
    } else if (goog.isObject(index_or_keyrange) ||
        !goog.isDef(index_or_keyrange)) {

      if (goog.isObject(index_or_keyrange)) {
        if (goog.DEBUG) {
          var msg = ydn.db.KeyRange.validate(index_or_keyrange);
          if (msg) {
            throw new ydn.debug.error.ArgumentException('invalid key range: ' +
                ydn.json.toShortString(index_or_keyrange) + ' ' + msg);
          }
        }
        key_range = ydn.db.KeyRange.parseIDBKeyRange(index_or_keyrange);
      } else {
        if (goog.isDefAndNotNull(index_or_keyrange)) {
          throw new ydn.debug.error.ArgumentException('key range must be ' +
              ' an object but found ' +
              ydn.json.toShortString(index_or_keyrange) + ' of type ' +
              typeof index_or_keyrange);
        }
        key_range = null;
      }
    } else {
      throw new ydn.debug.error.ArgumentException('key range must be an ' +
          'object, but ' + ydn.json.toShortString(index_key_range) +
          ' of type ' + typeof index_or_keyrange + ' found.');
    }

    this.logger.finer('countKeyRange: ' + store_name + ' ' +
        (index_name ? index_name : '') + ydn.json.stringify(key_range));
    req = this.tx_thread.request(ydn.db.Request.Method.COUNT, store_names);
    req.addTxback(function(tx) {
      this.getExecutor().countKeyRange(req, store_names[0], key_range,
          index_name, !!unique);
    }, this);

  } else {
    throw new ydn.debug.error.ArgumentException(
        'Invalid store name or store names.');
  }

  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.get = function(arg1, arg2) {

  var me = this;
  var req;

  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {ydn.db.Key}
     */
    var k = arg1;
    var k_store_name = k.getStoreName();
    if (!this.schema.hasStore(k_store_name)) {
      if (this.schema.isAutoSchema()) {
        return goog.async.Deferred.succeed(undefined);
      } else {
        throw new ydn.debug.error.ArgumentException('Store: ' +
            k_store_name + ' not found.');
      }
    }

    var kid = k.getId();
    this.logger.finer('getByKey: ' + k_store_name + ':' + kid);
    req = this.tx_thread.request(ydn.db.Request.Method.GET, [k_store_name]);
    req.addTxback(function() {
      this.getExecutor().getById(req, k_store_name, kid);
    }, this);
  } else if (goog.isString(arg1) && goog.isDef(arg2)) {
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    if (!store) {
      if (this.schema.isAutoSchema()) {
        return goog.async.Deferred.succeed(undefined);
      } else {
        throw new ydn.debug.error.ArgumentException('Store name "' +
            store_name + '" not found.');
      }
    }
    var id = arg2;
    goog.asserts.assert(ydn.db.Key.isValidKey(id), 'key ' + id + ' of type ' +
        (typeof id) + ' is not a valid key');
    this.logger.finer('getById: ' + store_name + ':' + id);
    req = this.tx_thread.request(ydn.db.Request.Method.GET, [store_name]);
    req.addTxback(function() {
      this.getExecutor().getById(req, store_name, /** @type {IDBKey} */ (id));
    }, this);

  } else {
    throw new ydn.debug.error.ArgumentException(
        'get require valid input arguments.');
  }

  return req;
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.keys = function(opt_store_name, arg1,
    arg2, arg3, arg4, arg5) {
  var me = this;

  /**
   * @type {number}
   */
  var limit;
  /**
   * @type {number}
   */
  var offset;
  /**
   * @type {ydn.db.IDBKeyRange}
   */
  var range = null;
  /**
   * @type {boolean}
   */
  var reverse = false;
  /**
   *
   * @type {string}
   */
  var store_name = /** @type {string} */ (opt_store_name);

  var store = this.schema.getStore(store_name);

  if (goog.DEBUG) {
    if (!goog.isString(store_name)) {
      throw new ydn.debug.error.ArgumentException(
          'store name must be a string, ' +
          'but ' + store_name + ' of type ' + typeof store_name + ' is not.');
    }
    if (!this.schema.isAutoSchema()) {
      if (!store) {
        throw new ydn.debug.error.ArgumentException('store name "' +
            store_name + '" not found.');
      }
      if (goog.isString(arg1)) {
        var index = store.getIndex(arg1);
        if (!index) {
          throw new ydn.debug.error.ArgumentException('index "' + arg1 +
              '" not found in store "' + store_name + '".');
        }
      }
    }
  }

  if (this.schema.isAutoSchema() && !store) {
    return ydn.db.Request.succeed(ydn.db.Request.Method.KEYS, []);
  }

  var req;

  if (goog.isString(arg1)) { // index key range
    var index_name = arg1;
    if (goog.DEBUG) {
      var msg = ydn.db.KeyRange.validate(/** @type {KeyRangeJson} */ (arg2));
      if (msg) {
        throw new ydn.debug.error.ArgumentException('invalid key range: ' +
            arg2 + ' ' + msg);
      }
    }
    range = ydn.db.KeyRange.parseIDBKeyRange(
        /** @type {KeyRangeJson} */ (arg2));

    if (goog.isNumber(arg3)) {
      limit = arg3;
    } else if (!goog.isDef(arg3)) {
      limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    } else {
      throw new ydn.debug.error.ArgumentException('limit must be a number');
    }
    if (goog.isNumber(arg4)) {
      offset = arg4;
    } else if (!goog.isDef(arg4)) {
      offset = 0;
    } else {
      throw new ydn.debug.error.ArgumentException('offset must be a number');
    }
    if (goog.isDef(arg5)) {
      if (goog.isBoolean) {
        reverse = arg5;
      } else {
        throw new ydn.debug.error.ArgumentException(
            'reverse must be a boolean');
      }
    }
    this.logger.finer('keysByIndexKeyRange: ' + store_name);
    req = this.tx_thread.request(ydn.db.Request.Method.KEYS_INDEX,
        [store_name]);
    req.addTxback(function() {
      this.getExecutor().keysByIndexKeyRange(req, store_name,
          index_name, range, reverse, limit, offset, false);
    }, this);
  } else {
    if (goog.isObject(arg1)) {
      if (goog.DEBUG) {
        var msg = ydn.db.KeyRange.validate(arg1);
        if (msg) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
              ydn.json.toShortString(arg1) + ' ' + msg);
        }
      }
      range = ydn.db.KeyRange.parseIDBKeyRange(arg1);
    } else {
      if (goog.DEBUG && goog.isDefAndNotNull(arg1)) {
        throw new TypeError('invalid key range: ' +
            ydn.json.toShortString(arg1) + ' of type ' + typeof arg1);
      }
      range = null;
    }
    if (goog.isNumber(arg2)) {
      limit = arg2;
    } else if (!goog.isDef(arg2)) {
      limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    } else {
      throw new ydn.debug.error.ArgumentException('limit must be a number');
    }
    if (goog.isNumber(arg3)) {
      offset = arg3;
    } else if (!goog.isDef(arg3)) {
      offset = 0;
    } else {
      throw new ydn.debug.error.ArgumentException('offset must be a number');
    }
    if (goog.isDef(arg4)) {
      if (goog.isBoolean(arg4)) {
        reverse = arg4;
      } else {
        throw new ydn.debug.error.ArgumentException(
            'reverse must be a boolean');
      }
    }
    this.logger.finer('keysByKeyRange: ' + store_name);
    req = this.tx_thread.request(ydn.db.Request.Method.KEYS, [store_name]);
    req.addTxback(function() {
      this.getExecutor().keysByKeyRange(req, store_name, range, reverse,
          limit, offset);
    }, this);
  }

  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.values = function(arg0, arg1, arg2, arg3, arg4,
                                                   arg5) {

  var me = this;
  var req;
  var method = ydn.db.Request.Method.NONE;

  /**
   * @type {number}
   */
  var limit;
  /**
   * @type {number}
   */
  var offset;
  /**
   * @type {boolean}
   */
  var reverse = false;

  if (goog.isString(arg0)) {
    var store_name = arg0;
    var store = this.schema.getStore(store_name);
    if (!store) {
      if (this.schema.isAutoSchema()) {
        return goog.async.Deferred.succeed([]);
      } else {
        throw new ydn.db.NotFoundError(store_name);
      }
    }

    if (goog.isArray(arg1)) {
      if (goog.DEBUG && (goog.isDef(arg2) || goog.isDef(arg3))) {
        throw new ydn.debug.error.ArgumentException('too many input arguments');
      }
      var ids = arg1;
      this.logger.finer('listByIds: ' + store_name + ' ' +
          ids.length + ' ids');
      req = this.tx_thread.request(ydn.db.Request.Method.VALUES_IDS,
          [store_name]);
      req.addTxback(function() {
        this.getExecutor().listByIds(req, store_name, ids);
      }, this);
    } else if (goog.isString(arg1)) { // index name
      var index_name = arg1;
      if (goog.DEBUG) {
        if (!store.hasIndex(index_name)) {
          throw new ydn.debug.error.ArgumentException('index "' +
              index_name + '" not found in store "' + store_name + '"');
        }
        var msg = ydn.db.KeyRange.validate(/** @type {KeyRangeJson} */ (arg2));
        if (msg) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
              arg2 + ' ' + msg);
        }
      }
      var range = ydn.db.KeyRange.parseIDBKeyRange(
          /** @type {KeyRangeJson} */ (arg2));
      if (!goog.isDef(arg3)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg3)) {
        limit = arg3;
      } else {
        throw new ydn.debug.error.ArgumentException('limit must be a number.');
      }
      if (!goog.isDef(arg4)) {
        offset = 0;
      } else if (goog.isNumber(arg4)) {
        offset = arg4;
      } else {
        throw new ydn.debug.error.ArgumentException('offset must be a number.');
      }
      if (goog.isBoolean(arg5)) {
        reverse = arg5;
      } else if (goog.isDef(arg5)) {
        throw new ydn.debug.error.ArgumentException(
            'reverse must be a boolean, but ' + arg5);
      }
      this.logger.finer('listByIndexKeyRange: ' + store_name + ':' +
          index_name);
      method = ydn.db.Request.Method.VALUES_INDEX;
      req = this.tx_thread.request(method, [store_name]);
      req.addTxback(function() {
        this.getExecutor().listByIndexKeyRange(req, store_name,
            index_name, range, reverse, limit, offset, false);
      }, this);
    } else {
      var range = null;
      if (goog.isObject(arg1)) {
        if (goog.DEBUG) {
          var msg = ydn.db.KeyRange.validate(arg1);
          if (msg) {
            throw new ydn.debug.error.ArgumentException('invalid key range: ' +
                arg1 + ' ' + msg);
          }
        }
        range = ydn.db.KeyRange.parseIDBKeyRange(arg1);
      } else if (goog.DEBUG && goog.isDefAndNotNull(arg1)) {
        throw new TypeError('expect key range object, but found "' +
            ydn.json.toShortString(arg1) + '" of type ' + typeof arg1);
      }
      if (!goog.isDef(arg2)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg2)) {
        limit = arg2;
      } else {
        throw new ydn.debug.error.ArgumentException('limit must be a number, ' +
            'but ' + arg2 + ' is ' + typeof arg2);
      }
      if (!goog.isDef(arg3)) {
        offset = 0;
      } else if (goog.isNumber(arg3)) {
        offset = arg3;
      } else {
        throw new ydn.debug.error.ArgumentException(
            'offset must be a number, ' + 'but ' + arg3 + ' is ' + typeof arg3);
      }
      if (goog.isDef(arg4)) {
        if (goog.isBoolean(arg4)) {
          reverse = arg4;
        } else {
          throw new ydn.debug.error.ArgumentException('reverse must be a ' +
              'boolean, but ' + arg4 + ' is ' + typeof arg4);
        }
      }
      this.logger.finer((range ? 'listByKeyRange: ' : 'listByStore: ') +
          store_name);
      method = ydn.db.Request.Method.VALUES;
      req = this.tx_thread.request(method, [store_name]);
      req.addTxback(function() {
        this.getExecutor().listByKeyRange(req, store_name, range,
            reverse, limit, offset);
      }, this);
    }
  } else if (goog.isArray(arg0)) {
    if (arg0[0] instanceof ydn.db.Key) {
      var store_names = [];
      /**
       * @type {!Array.<!ydn.db.Key>}
       */
      var keys = /** @type {!Array.<!ydn.db.Key>} */ (arg0);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var i_store_name = key.getStoreName();
        if (!this.schema.hasStore(i_store_name)) {
          if (this.schema.isAutoSchema()) {
            var fail_array = [];
            // I think more efficient than: fail_array.length = keys.length;
            fail_array[keys.length - 1] = undefined;
            return goog.async.Deferred.succeed(fail_array);
          } else {
            throw new ydn.debug.error.ArgumentException('Store: ' +
                i_store_name + ' not found.');
          }
        }
        if (!goog.array.contains(store_names, i_store_name)) {
          store_names.push(i_store_name);
        }
      }
      this.logger.finer('listByKeys: ' + ydn.json.stringify(store_names) +
          ' ' + keys.length + ' keys');
      req = this.tx_thread.request(ydn.db.Request.Method.VALUES_KEYS,
          store_names);
      req.addTxback(function() {
        this.getExecutor().listByKeys(req, keys);
      }, this);
    } else {
      throw new ydn.debug.error.ArgumentException('first argument' +
          'must be array of ydn.db.Key, but ' + arg0[0] + ' of ' +
          typeof arg0[0] + ' found.');
    }
  } else {
    throw new ydn.debug.error.ArgumentException('first argument ' + arg0 +
        ' is invalid.');
  }

  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.add = function(store_name_or_schema, value,
                                               opt_keys) {

  var store_name = goog.isString(store_name_or_schema) ?
      store_name_or_schema : goog.isObject(store_name_or_schema) ?
      store_name_or_schema['name'] : undefined;
  if (!goog.isString(store_name)) {
    throw new ydn.debug.error.ArgumentException('store name ' + store_name +
        ' must be a string, but ' + typeof store_name);
  }

  var store = this.schema.getStore(store_name);
  if (!store) {
    if (!this.schema.isAutoSchema()) {
      throw new ydn.debug.error.ArgumentException('store name "' + store_name +
          '" not found.');
    }
    var schema = goog.isObject(store_name_or_schema) ?
        store_name_or_schema : {'name': store_name};

    // this is async process, but we don't need to wait for it.
    store = ydn.db.schema.Store.fromJSON(/** @type {!StoreSchema} */ (schema));
    this.logger.finer('Adding object store: ' + store_name);
    this.addStoreSchema(store);

  } else if (this.schema.isAutoSchema() &&
      goog.isObject(store_name_or_schema)) {
    // if there is changes in schema, change accordingly.
    var new_schema = ydn.db.schema.Store.fromJSON(store_name_or_schema);
    var diff = store.difference(new_schema);
    if (diff) {
      throw new ydn.error.NotSupportedException(diff);
      // this.addStoreSchema(store);
    }
  }

  var df = ydn.db.base.createDeferred();
  var hdf = df;
  var sync_type = ydn.db.Request.Method.ADD;
  var me = this;

  if (!store) {
    throw new ydn.debug.error.ArgumentException('store name "' + store_name +
        '" not found.');
  }
  // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBObjectStore#put
  if ((goog.isString(store.keyPath)) && goog.isDef(opt_keys)) {
    // The object store uses in-line keys or has a key generator, and a key
    // parameter was provided.
    throw new ydn.debug.error.ArgumentException(
        'key must not be provided while the store uses in-line key.');
  //} else if (store.autoIncrement && goog.isDef(opt_keys)) {
    // The object store uses in-line keys or has a key generator, and a key
    // parameter was provided.
  //  throw new ydn.debug.error.ArgumentException('key must not be provided ' +
  //      'while autoIncrement is true.');
  } else if (!store.usedInlineKey() && !store.autoIncrement &&
      !goog.isDef(opt_keys)) {
    // The object store uses out-of-line keys and has no key generator, and no
    // key parameter was provided.
    throw new ydn.debug.error.ArgumentException(
        'out-of-line key must be provided.');
  }

  if (goog.isArray(value)) {
    var objs = value;
    var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
    //console.log('waiting to putObjects');
    this.logger.finer('addObjects: ' + store_name + ' ' + objs.length +
        ' objects');

    for (var i = 0; i < objs.length; i++) {
      store.generateIndex(objs[i]);
    }

    sync_type = ydn.db.Request.Method.ADDS;
    this.tx_thread.exec(hdf, function(tx, tx_no, cb) {
      //console.log('putObjects');
      me.getExecutor().addObjects(tx, tx_no, cb, store_name, objs, keys);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);

    if (store.dispatch_events) {
      df.addCallback(function(keys) {
        var event = new ydn.db.events.StoreEvent(ydn.db.events.Types.CREATED,
            me.getStorage(), store.getName(), keys, objs);
        me.getStorage().dispatchEvent(event);
      });
    }

  } else if (goog.isObject(value)) {
    var obj = value;
    var key = /** @type {number|string|undefined} */ (opt_keys);
    var label = 'store: ' + store_name + ' key: ' + store.extractKey(obj, key);

    this.logger.finer('addObject: ' + label);
    store.generateIndex(obj);

    this.tx_thread.exec(hdf, function(tx, tx_no, cb) {
      me.getExecutor().addObject(tx, tx_no, cb, store_name, obj, key);
    }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);

    if (store.dispatch_events) {
      df.addCallback(function(key) {
        var event = new ydn.db.events.RecordEvent(ydn.db.events.Types.CREATED,
            me.getStorage(), store.getName(), key, obj);
        me.getStorage().dispatchEvent(event);
      });
    }

  } else {
    throw new ydn.debug.error.ArgumentException('record must be an object or ' +
        'array list of objects' +
        ', but ' + value + ' of type ' + typeof value + ' found.');
  }

  if (ydn.db.base.USE_HOOK) {
    df = store.hook(sync_type, hdf, arguments);
  }

  return df;

};


/**
 *
 * @param {string|StoreSchema} store_name_schema store name or schema.
 * @return {ydn.db.schema.Store} store.
 * @private
 */
ydn.db.crud.DbOperator.prototype.getStore_ = function(store_name_schema) {

  var store_name = goog.isString(store_name_schema) ?
      store_name_schema : goog.isObject(store_name_schema) ?
      store_name_schema['name'] : undefined;
  if (!goog.isString(store_name)) {
    throw new ydn.debug.error.ArgumentException('store name must be a string');
  }

  var store = this.schema.getStore(store_name);
  if (!store) {
    if (!this.schema.isAutoSchema()) {
      throw new ydn.db.NotFoundError(store_name);
    }
    var schema = goog.isObject(store_name_schema) ?
        store_name_schema : {'name': store_name};

    // this is async process, but we don't need to wait for it.
    store = ydn.db.schema.Store.fromJSON(/** @type {!StoreSchema} */ (schema));
    this.logger.finer('Adding object store: ' + store_name);
    this.addStoreSchema(store);

  } else if (this.schema.isAutoSchema() && goog.isObject(store_name_schema))
  {
    // if there is changes in schema, change accordingly.
    var new_schema = ydn.db.schema.Store.fromJSON(store_name_schema);
    var diff = store.difference(new_schema);
    if (diff) {
      throw new ydn.error.NotSupportedException(diff);
      // this.addStoreSchema(store);
    }
  }
  if (!store) {
    throw new ydn.db.NotFoundError(store_name);
  }
  return store;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.load = function(store_name_or_schema, data,
                                                 opt_delimiter) {

  var delimiter = opt_delimiter || ',';

  var store = this.getStore_(store_name_or_schema);
  var store_name = store.getName();

  var df = ydn.db.base.createDeferred();
  var me = this;

  this.tx_thread.exec(df, function(tx, tx_no, cb) {
    me.getExecutor().putData(tx, tx_no, cb, store_name, data, delimiter);
  }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);
  return df;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.put = function(arg1, value, opt_keys) {

  var df = ydn.db.base.createDeferred();
  var hdf = df;
  var sync_type = ydn.db.Request.Method.NONE;
  var me = this;

  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {!ydn.db.Key}
     */
    var k = arg1;
    var k_s_name = k.getStoreName();
    var k_store = this.schema.getStore(k_s_name);
    if (!k_store) {
      throw new ydn.debug.error.ArgumentException('store "' + k_s_name +
          '" not found.');
    }
    if (k_store.usedInlineKey()) {
      var v_k = k_store.extractKey(value);
      if (goog.isDefAndNotNull(v_k)) {
        if (ydn.db.cmp(v_k, k.getId()) != 0) {
          throw new ydn.debug.error.ArgumentException('Inline key must be ' +
              k + ' but ' + v_k + ' found.');
        }
      } else {
        k_store.setKeyValue(value, k.getId());
      }
      return this.put(k_s_name, value);
    } else {
      return this.put(k_s_name, value, k.getId());
    }
  } else if (goog.isArray(arg1)) { // array of keys
    if (goog.isDef(opt_keys)) {
      throw new ydn.debug.error.ArgumentException('too many arguments');
    }
    var db_keys = /** @type {!Array.<!ydn.db.Key>} */ (arg1);
    if (goog.DEBUG && !goog.isDef(value)) {
      throw new ydn.debug.error.ArgumentException('record values required');
    }
    goog.asserts.assertArray(value, 'record values must also be in an array');
    var values = /** @type {!Array} */ (value);
    goog.asserts.assert(db_keys.length === values.length, 'number of keys ' +
        'and number of object must be same, but found ' + db_keys.length +
        ' vs. ' + values.length);
    var store_names = [];
    for (var i = 0, n = db_keys.length; i < n; i++) {
      var s_name = db_keys[i].getStoreName();
      if (goog.array.indexOf(store_names, s_name) == -1) {
        store_names.push(s_name);
      }
      var store = this.schema.getStore(s_name);
      if (!store) {
        throw new ydn.debug.error.ArgumentException('store "' + s_name +
            '" not found.');
      }
      if (store.usedInlineKey()) {
        store.setKeyValue(values[i], db_keys[i].getId());
      }
    }
    this.logger.finer('putByKeys: to ' + ydn.json.stringify(store_names) + ' ' +
        values.length + ' objects');

    for (var i = 0; i < values.length; i++) {
      store.generateIndex(values[i]);
    }
    sync_type = ydn.db.Request.Method.PUT_KEYS;

    this.tx_thread.exec(hdf, function(tx, tx_no, cb) {
      me.getExecutor().putByKeys(tx, tx_no, cb, values, db_keys);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE);
  } else if (goog.isString(arg1) || goog.isObject(arg1)) {
    var store = this.getStore_(arg1);
    var st_name = store.getName();

    // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBObjectStore#put
    if (store.usedInlineKey() && goog.isDef(opt_keys)) {
      // The object store uses in-line keys or has a key generator, and a key
      // parameter was provided.
      throw new ydn.debug.error.ArgumentException(
          'key must not be provided while the store uses in-line key.');
    //} else if (store.autoIncrement && goog.isDef(opt_keys)) {
      // The object store uses in-line keys or has a key generator, and a key
      // parameter was provided.
    //  throw new ydn.debug.error.ArgumentException('key must not be provided' +
    //      ' while autoIncrement is true.');
    } else if (!store.usedInlineKey() && !store.autoIncrement &&
        !goog.isDef(opt_keys)) {
      // The object store uses out-of-line keys and has no key generator, and no
      // key parameter was provided.
      throw new ydn.debug.error.ArgumentException(
          'out-of-line key must be provided.');
    }

    if (goog.isArray(value)) {
      var objs = value;
      var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
      this.logger.finer('putObjects: ' + st_name + ' ' +
          objs.length + ' objects');
      for (var i = 0; i < objs.length; i++) {
        store.generateIndex(objs[i]);
      }
      sync_type = ydn.db.Request.Method.PUTS;
      this.tx_thread.exec(hdf, function(tx, tx_no, cb) {
        //console.log('putObjects');
        me.getExecutor().putObjects(tx, tx_no, cb, st_name, objs, keys);
      }, [st_name], ydn.db.base.TransactionMode.READ_WRITE);

      if (store.dispatch_events) {
        df.addCallback(function(keys) {
          var event = new ydn.db.events.StoreEvent(ydn.db.events.Types.UPDATED,
              me.getStorage(), st_name, keys, objs);
          me.getStorage().dispatchEvent(event);
        });
      }

    } else if (goog.isObject(value)) {
      var obj = value;
      var key = /** @type {number|string|undefined} */ (opt_keys);
      if (goog.DEBUG) {
        if (goog.isDef(key)) {
          goog.asserts.assert(ydn.db.Key.isValidKey(key), key +
              ' of type ' + (typeof key) + ' is invalid key for ' +
              ydn.json.toShortString(obj));
        } else if (!store.isAutoIncrement() && store.usedInlineKey()) {
          goog.asserts.assert(ydn.db.Key.isValidKey(store.extractKey(obj)),
              'in-line key on ' + store.getKeyPath() + ' must provided in ' +
              ydn.json.toShortString(obj));
        }
      }
      this.logger.finer('putObject: ' + st_name + ' ' + key);
      store.generateIndex(obj);
      sync_type = ydn.db.Request.Method.PUT;
      this.tx_thread.exec(hdf, function(tx, tx_no, cb) {
        me.getExecutor().putObject(tx, tx_no, cb, st_name, obj, key);
      }, [st_name], ydn.db.base.TransactionMode.READ_WRITE);

      if (store.dispatch_events) {
        df.addCallback(function(key) {
          var event = new ydn.db.events.RecordEvent(ydn.db.events.Types.UPDATED,
              me.getStorage(), st_name, key, obj);
          me.getStorage().dispatchEvent(event);
        });
      }

    } else {
      throw new ydn.debug.error.ArgumentException('put record value must be ' +
          'Object or array of Objects');
    }
  } else {
    throw new ydn.debug.error.ArgumentException('the first argument of put ' +
        'must be store name, store schema or array of keys.');
  }

  if (ydn.db.base.USE_HOOK) {
    df = store.hook(sync_type, hdf, arguments);
  }

  return df;

};


/**
 * Dump object into the database. Use only by synchronization process when
 * updating from
 * server.
 * This is friendly module use only.
 * @param {string|!Array.<!ydn.db.Key>} store_name store name.
 * @param {!Array.<Object>} objs objects.
 * @param {!Array.<!IDBKey>=} opt_keys keys.
 * @return {!goog.async.Deferred} df return no result.
 * @override
 */
ydn.db.crud.DbOperator.prototype.dumpInternal = function(store_name, objs,
                                                         opt_keys) {
  var df = new goog.async.Deferred();
  var me = this;

  var store_names, db_keys;
  if (goog.isString(store_name)) {
    var store = this.schema.getStore(store_name);
    if (goog.DEBUG) {
      if (store) {
        if (!store.usedInlineKey() && !store.isAutoIncrement() &&
            !goog.isDefAndNotNull(opt_keys)) {
          throw new ydn.debug.error.ArgumentException(
              'key required for store "' + store_name + '"');
        }
      } else {
        throw new ydn.db.NotFoundError(store_name);
      }
    }
    for (var i = 0; i < objs.length; i++) {
      store.generateIndex(objs[i]);
    }
    store_names = [store_name];
  } else {
    goog.asserts.assertArray(store_name, 'store name ' + store_name + ' +' +
        ' must be an array or string, but ' + (typeof store_name));
    db_keys = store_name;
    store_names = [];
    for (var i = 0, n = db_keys.length; i < n; i++) {
      var s_name = db_keys[i].getStoreName();
      var store = this.schema.getStore(s_name);
      if (goog.array.indexOf(store_names, s_name) == -1) {
        store_names.push(s_name);
      }
      if (goog.DEBUG && !store) {
        throw new ydn.db.NotFoundError(s_name);
      }
      store.generateIndex(objs[i]);
    }
  }

  this.sync_thread.exec(df, function(tx, tx_no, cb) {
    if (goog.isString(store_name)) {
      me.getExecutor().putObjects(tx, tx_no, cb, store_name, objs, opt_keys);
    } else {
      me.getExecutor().putByKeys(tx, tx_no, cb, objs, db_keys);
    }
  }, store_names, ydn.db.base.TransactionMode.READ_WRITE);
  return df;
};


/**
 * Remove record by keys.
 * @param {!Array.<!ydn.db.Key>} keys keys.
 * @return {!goog.async.Deferred} df.
 */
ydn.db.crud.DbOperator.prototype.removeInternal = function(keys) {
  var store_names = [];
  for (var i = 0, n = keys.length; i < n; i++) {
    var s_name = keys[i].getStoreName();
    if (goog.array.indexOf(store_names, s_name) == -1) {
      store_names.push(s_name);
    }
    if (goog.DEBUG && !this.schema.hasStore(s_name)) {
      throw new ydn.db.NotFoundError(s_name);
    }
  }
  var me = this;
  var df = new goog.async.Deferred();
  this.sync_thread.exec(df, function(tx, tx_no, cb) {
    me.getExecutor().removeByKeys(tx, tx_no, cb, keys);
  }, store_names, ydn.db.base.TransactionMode.READ_WRITE);
  return df;
};


/**
 * List records from the database. Use only by synchronization process when
 * updating from server.
 * This is friendly module use only.
 * @param {string} store_name store name.
 * @param {?string} index_name index name.
 * @param {IDBKeyRange|ydn.db.KeyRange} key_range key range.
 * @param {boolean} reverse reverse.
 * @param {number} limit limit.
 * @param {number=} opt_offset offset.
 * @return {!goog.async.Deferred} df.
 * @override
 */
ydn.db.crud.DbOperator.prototype.listInternal = function(store_name, index_name,
    key_range, reverse, limit, opt_offset) {
  var req;
  var me = this;
  var offset = opt_offset || 0;
  if (goog.DEBUG) {
    var store = this.schema.getStore(store_name);
    if (store) {
      if (index_name && !store.hasIndex(index_name)) {
        throw new ydn.db.NotFoundError('index "' + index_name + '" in store "' +
            store_name + '"');
      }
    } else {
      throw new ydn.db.NotFoundError(store_name);
    }
  }

  var kr = ydn.db.KeyRange.parseIDBKeyRange(key_range);
  if (goog.isString(index_name)) {
    var index = index_name;
    req = this.sync_thread.request(ydn.db.Request.Method.VALUES_INDEX,
        [store_name]);
    req.addTxback(function() {
      me.getExecutor().listByIndexKeyRange(req, store_name, index,
          kr, reverse, limit, offset, false);
    }, this);
  } else {
    req = this.sync_thread.request(ydn.db.Request.Method.VALUES_INDEX,
        [store_name]);
    req.addTxback(function() {
      me.getExecutor().listByKeyRange(req, store_name,
          kr, reverse, limit, offset);
    }, this);
  }
  return req;
};


/**
 * Retrieve record values from given list of key objects.
 * @param {!Array.<!ydn.db.Key>} keys keys to retrieve.
 * @return {!ydn.db.Request} df.
 */
ydn.db.crud.DbOperator.prototype.valuesInternal = function(keys) {
  var store_names = [];
  var n = keys.length;
  if (n == 0) {
    return ydn.db.Request.succeed(ydn.db.Request.Method.KEYS, []);
  }
  for (var i = 0; i < n; i++) {
    var s_name = keys[i].getStoreName();
    if (goog.array.indexOf(store_names, s_name) == -1) {
      store_names.push(s_name);
    }
    if (goog.DEBUG && !this.schema.hasStore(s_name)) {
      throw new ydn.db.NotFoundError(s_name);
    }
  }
  var me = this;
  var df = this.sync_thread.request(ydn.db.Request.Method.KEYS, store_names);
  df.addTxback(function() {
    me.getExecutor().listByKeys(df, keys);
  }, this);
  return df;
};


/**
 * List keys from the database. Use only by synchronization process when
 * updating from server.
 * This is friendly module use only.
 * @param {string} store_name store name.
 * @param {?string} index_name index name.
 * @param {?IDBKeyRange} key_range key range.
 * @param {boolean} reverse reverse.
 * @param {number} limit limit.
 * @return {!ydn.db.Request} df.
 * @override
 */
ydn.db.crud.DbOperator.prototype.keysInternal = function(store_name, index_name,
    key_range, reverse, limit) {
  var req;
  var me = this;

  if (goog.DEBUG) {
    var store = this.schema.getStore(store_name);
    if (store) {
      if (index_name && !store.hasIndex(index_name)) {
        throw new ydn.db.NotFoundError('index "' + index_name + '" in store "' +
            store_name + '"');
      }
    } else {
      throw new ydn.db.NotFoundError(store_name);
    }
  }

  if (goog.isString(index_name)) {
    var index = index_name;
    req = this.sync_thread.request(ydn.db.Request.Method.KEYS_INDEX,
        [store_name]);
    req.addTxback(function() {
      this.getExecutor().keysByIndexKeyRange(req, store_name, index,
          key_range, reverse, limit, 0, false);
    }, this);
  } else {
    req = this.sync_thread.request(ydn.db.Request.Method.KEYS,
        [store_name]);
    req.addTxback(function() {
      this.getExecutor().keysByKeyRange(req, store_name,
          key_range, reverse, limit, 0);
    }, this);
  }
  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.clear = function(arg1, arg2, arg3) {

  if (goog.DEBUG && goog.isDef(arg3)) {
    throw new ydn.debug.error.ArgumentException('too many input arguments');
  }

  var df = ydn.db.base.createDeferred();
  var me = this;

  if (goog.isString(arg1)) {
    var st_name = arg1;
    var store = this.schema.getStore(st_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store name "' + st_name +
          '" not found.');
    }

    if (goog.isObject(arg2)) {
      var key_range = ydn.db.KeyRange.parseIDBKeyRange(
          /** @type {KeyRangeJson} */ (arg2));
      if (goog.isNull(key_range)) {
        throw new ydn.debug.error.ArgumentException('clear method requires' +
            ' a valid non-null KeyRange object.');
      }
      this.logger.finer('clearByKeyRange: ' + st_name + ':' +
          ydn.json.stringify(key_range));
      this.tx_thread.exec(df, function(tx, tx_no, cb) {
        me.getExecutor().clearByKeyRange(tx, tx_no, cb, st_name, key_range);
      }, [st_name], ydn.db.base.TransactionMode.READ_WRITE);
    } else if (!goog.isDef(arg2)) {
      this.logger.finer('clearByStore: ' + st_name);
      this.tx_thread.exec(df, function(tx, tx_no, cb) {
        me.getExecutor().clearByStores(tx, tx_no, cb, [st_name]);
      }, [st_name], ydn.db.base.TransactionMode.READ_WRITE);

    } else {
      throw new ydn.debug.error.ArgumentException('clear method requires' +
          ' a valid KeyRange object as second argument, but found ' + arg2 +
          ' of type ' + typeof arg2);
    }

  } else if (!goog.isDef(arg1) || goog.isArray(arg1) &&
      goog.isString(arg1[0])) {
    var store_names = arg1 || this.schema.getStoreNames();
    this.logger.finer('clearByStores: ' + ydn.json.stringify(store_names));
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      me.getExecutor().clearByStores(tx, tx_no, cb, store_names);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE);

  } else {
    throw new ydn.debug.error.ArgumentException('first argument "' + arg1 +
        '" is invalid.');
  }

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.remove = function(arg1, arg2, arg3) {

  var df = ydn.db.base.createDeferred();
  var me = this;

  if (goog.isString(arg1)) {
    /**
     * @type {string}
     */
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store name "' + store_name +
          '" not found.');
    }
    if (goog.isDef(arg3)) {
      if (goog.isString(arg2)) {
        var index = store.getIndex(arg2);
        if (!index) {
          throw new ydn.debug.error.ArgumentException('index: ' + arg2 +
              ' not found in ' + store_name);
        }
        if (goog.isObject(arg3) || goog.isNull(arg3)) {
          var key_range = ydn.db.KeyRange.parseIDBKeyRange(
              /** @type {KeyRangeJson} */ (arg3));
          this.logger.finer('removeByIndexKeyRange: ' + store_name + ':' +
              index.getName() + ' ' + store_name);
          this.tx_thread.exec(df, function(tx, tx_no, cb) {
            me.getExecutor().removeByIndexKeyRange(tx, tx_no, cb, store_name,
                index.getName(), key_range);
          }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);
        } else {
          throw new ydn.debug.error.ArgumentException('key range ' + arg3 +
              ' is invalid type "' + typeof arg3 + '".');
        }
      } else {
        throw new ydn.debug.error.ArgumentException('index name "' + arg2 +
            '" must be a string, but ' + typeof arg2 + ' found.');
      }
    } else {
      if (goog.isString(arg2) || goog.isNumber(arg2) ||
          goog.isArrayLike(arg2) || arg2 instanceof Date) {
        var id = /** @type {IDBKey} */ (arg2);
        this.logger.finer('removeById: ' + store_name + ':' + id);
        var hdf = df;
        if (ydn.db.base.USE_HOOK) {
          df = store.hook(ydn.db.Request.Method.REMOVE, hdf,
              arguments);
        }
        this.tx_thread.exec(hdf, function(tx, tx_no, cb) {
          me.getExecutor().removeById(tx, tx_no, cb, store_name, id);
        }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);

        if (store.dispatch_events) {
          df.addCallback(function(key) {
            var event = new ydn.db.events.RecordEvent(
                ydn.db.events.Types.DELETED,
                me.getStorage(), store_name, key, undefined);
            me.getStorage().dispatchEvent(event);
          });
        }

      } else if (goog.isObject(arg2)) {
        var key_range = ydn.db.KeyRange.parseIDBKeyRange(
            /** @type {KeyRangeJson} */ (arg2));
        this.logger.finer('removeByKeyRange: ' + store_name + ':' +
            ydn.json.stringify(key_range));
        this.tx_thread.exec(df, function(tx, tx_no, cb) {
          me.getExecutor().removeByKeyRange(tx, tx_no, cb, store_name,
              key_range);
        }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);
        if (store.dispatch_events) {
          df.addCallback(function(key) {
            var event = new ydn.db.events.StoreEvent(
                ydn.db.events.Types.DELETED,
                me.getStorage(), store_name, key, undefined);
            me.getStorage().dispatchEvent(event);
          });
        }
      } else {
        throw new ydn.debug.error.ArgumentException(
            'Invalid key or key range "' + arg2 + '" of type ' + typeof arg2);
      }
    }
  } else if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {!ydn.db.Key}
     */
    var key = arg1;
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      me.getExecutor().removeById(tx, tx_no, cb, key.getStoreName(),
          arg1.getId());
    }, [key.getStoreName()], ydn.db.base.TransactionMode.READ_WRITE);
  } else if (goog.isArray(arg1)) {
    /**
     * @type {!Array.<!ydn.db.Key>}
     */
    var arr = arg1;
    var store_names = [];
    for (var i = 0, n = arr.length; i < n; i++) {
      if (goog.DEBUG && !(arr[i] instanceof ydn.db.Key)) {
        throw new ydn.debug.error.ArgumentException('key list element at ' + i +
            ' of ' + n + ' must be yn.db.Key, but "' +
            ydn.json.toShortString(arg1[i]) +
            '" (' + goog.typeOf(arg1[i]) + ') ' +
            'is not ydn.db.Key.');
      }
      var st = arr[i].getStoreName();
      if (goog.array.indexOf(store_names, st) == -1) {
        store_names.push(st);
      }
    }
    if (store_names.length < 1) {
      throw new ydn.debug.error.ArgumentException('at least one valid key ' +
          'required in key list "' + ydn.json.toShortString(arg1) + '"');
    }
    this.tx_thread.exec(df, function(tx, tx_no, cb) {
      me.getExecutor().removeByKeys(tx, tx_no, cb, arr);
    }, store_names, ydn.db.base.TransactionMode.READ_WRITE);
  } else {
    throw new ydn.debug.error.ArgumentException('first argument requires ' +
        'store name, key (ydn.db.Key) or list of keys (array) , but "' +
        ydn.json.toShortString(arg1) + '" (' + goog.typeOf(arg1) + ') found.');
  }

  return df;
};


if (goog.DEBUG) {
  /** @override */
  ydn.db.crud.DbOperator.prototype.toString = function() {
    var s = 'DbOperator:' + this.getStorage().getName();
    return s;
  };
}


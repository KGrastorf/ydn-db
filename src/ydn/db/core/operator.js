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
* @fileoverview Database operator providing index and table scan query.
*
* @author kyawtun@yathit.com (Kyaw Tun)
*/

goog.provide('ydn.db.core.DbOperator');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.core.IOperator');
goog.require('ydn.db.core.req.IRequestExecutor');
if (!ydn.db.base.NO_IDB) {
  goog.require('ydn.db.core.req.IndexedDb');
}
if (!ydn.db.base.NO_SIMPLE) {
  goog.require('ydn.db.core.req.SimpleStore');
}
if (!ydn.db.base.NO_WEBSQL) {
  goog.require('ydn.db.core.req.WebSql');
}
goog.require('ydn.db.crud.DbOperator');
goog.require('ydn.debug.error.ArgumentException');



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
 * @param {ydn.db.tr.IThread} thread execution thread.
 * @param {ydn.db.tr.IThread} sync_thread synchronization thread.
 * @implements {ydn.db.core.IOperator}
 * @constructor
 * @extends {ydn.db.crud.DbOperator}
 * @struct
*/
ydn.db.core.DbOperator = function(storage, schema, thread,
                                  sync_thread) {
  goog.base(this, storage, schema, thread, sync_thread);
};
goog.inherits(ydn.db.core.DbOperator, ydn.db.crud.DbOperator);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.DbOperator.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.DbOperator');


/**
 * @define {boolean} debug flag.
 */
ydn.db.core.DbOperator.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.get = function(arg1, arg2) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {
    /**
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    var q_store_name = q.getStoreName();
    var store = this.schema.getStore(q_store_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store "' +
          q_store_name + '" not found.');
    }
    var index_name = q.getIndexName();
    if (goog.isDef(index_name) && !store.hasIndex(index_name)) {
      throw new ydn.debug.error.ArgumentException('index "' +
          index_name + '" not found in store "' + q_store_name + '".');
    }
    this.logger.finer('getByIterator:' + q);
    var df = this.tx_thread.request(ydn.db.Request.Method.GET_ITER,
        [q_store_name]);
    df.addTxback(function() {
      this.getIndexExecutor().getByIterator(df, q);
    }, this);
    return df;
  } else {
    return goog.base(this, 'get', arg1, arg2);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.keys = function(arg1, arg2, arg3, arg4, arg5) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {

    /**
     * @type {number}
     */
    var limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    if (goog.isNumber(arg2)) {
      limit = /** @type {number} */ (arg2);
      if (limit < 1) {
        throw new ydn.debug.error.ArgumentException('limit must be ' +
            'a positive value, but ' + arg2);
      }
    } else if (goog.isDef(arg2)) {
      throw new ydn.debug.error.ArgumentException('limit must be a number, ' +
          ' but ' + arg2);
    }
    if (goog.isDef(arg3)) {
      throw new ydn.debug.error.ArgumentException(
          'offset must not be specified');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;

    this.logger.finer('keysByIterator:' + q);
    var df = this.tx_thread.request(ydn.db.Request.Method.KEYS_ITER,
        q.stores());
    df.addTxback(function() {
      this.getIndexExecutor().keysByIterator(df, q, limit);
    }, this);

    return df;
  } else {
    return goog.base(this, 'keys', arg1, arg2, arg3, arg4, arg5);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.count = function(arg1, arg2, arg3) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {
    if (goog.isDef(arg2) || goog.isDef(arg3)) {
      throw new ydn.debug.error.ArgumentException('too many arguments.');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    this.logger.finer('countKeyRange:' + q);
    var df = this.tx_thread.request(ydn.db.Request.Method.COUNT, q.stores());
    df.addTxback(function() {
      this.getIndexExecutor().countKeyRange(df, q.getStoreName(),
          q.keyRange(), q.getIndexName(), q.isUnique());
    }, this);

    return df;
  } else {
    return goog.base(this, 'count', arg1, arg2, arg3);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.values = function(arg1, arg2, arg3, arg4,
                                                   arg5, arg6) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {

    /**
     * @type {number}
     */
    var limit;
    if (goog.isNumber(arg2)) {
      limit = /** @type {number} */ (arg2);
      if (limit < 1) {
        throw new ydn.debug.error.ArgumentException('limit must be ' +
            'a positive value, but ' + limit);
      }
    } else if (goog.isDef(arg2)) {
      throw new ydn.debug.error.ArgumentException('limit must be a number, ' +
          'but ' + arg2);
    }
    if (goog.isDef(arg3)) {
      throw new ydn.debug.error.ArgumentException(
          'offset must not be specified');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    this.logger.finer('listByIterator:' + q);
    return goog.base(this, 'values', arg1, arg2, arg3, arg4, arg5, arg6);
    var df = this.tx_thread.request(ydn.db.Request.Method.VALUES_ITER,
        q.stores());
    df.addTxback(function() {
      this.getIndexExecutor().listByIterator(df, q, limit);
    }, this);

    return df;
  } else {
    return goog.base(this, 'values', arg1, arg2, arg3, arg4, arg5, arg6);
  }

};


/**
 * Cursor scan iteration.
 * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): !Array} solver
 * solver.
 * @param {!Array.<!ydn.db.Iterator>=} opt_iterators the cursor.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.core.DbOperator.prototype.scan = function(solver, opt_iterators) {

  var df = ydn.db.base.createDeferred();
  if (goog.DEBUG) {
    if (goog.isDef(opt_iterators)) {
      if (!goog.isArray(opt_iterators)) {
        throw new TypeError('Iterator argument must be an array.');
      }
      for (var i = 0; i < opt_iterators.length; i++) {
        var is_iter = opt_iterators[i] instanceof ydn.db.Iterator;
        if (!is_iter) {
          throw new TypeError('Iterator at ' + i +
              ' must be cursor range iterator.');
        }
      }
    }
  }

  /**
   * @type {!Array.<!ydn.db.Iterator>}
   */
  var iterators;
  if (opt_iterators) {
    iterators = opt_iterators;
  } else {
    var iter = solver.getIterators();
    goog.asserts.assertArray(iter, 'array of iterators required.');
    iterators = iter;
  }

  var tr_mode = ydn.db.base.TransactionMode.READ_ONLY;

  var scopes = [];
  for (var i = 0; i < iterators.length; i++) {
    var stores = iterators[i].stores();
    for (var j = 0; j < stores.length; j++) {
      if (!goog.array.contains(scopes, stores[j])) {
        scopes.push(stores[j]);
      }
    }
  }

  this.logger.finest(this + ': scan for ' + iterators.length +
      ' iterators on ' + scopes);

  var me = this;

  this.tx_thread.exec(df, function(tx, tx_no, cb) {

    var lbl = tx_no + ' ' + me + ' scanning';
    me.logger.finest(lbl);
    var done = false;

    var total;
    var idx2iterator = []; // convert main index to iterator index

    var keys = [];
    var values = [];
    /**
     *
     * @type {Array.<!ydn.db.Cursor>}
     */
    var cursors = [];

    var do_exit = function() {

      for (var k = 0; k < cursors.length; k++) {
        cursors[k].exit();
      }
      done = true;
      goog.array.clear(cursors);
      // console.log('existing');
      me.logger.finer('success ' + lbl);
      cb(undefined);
    };

    var result_count = 0;
    var streamer_result_count = 0;
    var has_key_count = 0;

    /**
     * All results collected. Now invoke solver and do advancement.
     */
    var on_result_ready = function() {

      // all cursor has results, than sent to join algorithm callback.

      var out;
      if (solver instanceof ydn.db.algo.AbstractSolver) {
        out = solver.solver(keys, values);
      } else {
        out = solver(keys, values);
      }
      if (ydn.db.core.DbOperator.DEBUG) {
        window.console.log(me + ' received result from solver ' +
            ydn.json.stringify(out) + ' for keys ' + ydn.json.stringify(keys));
      }
      var next_primary_keys = [];
      var next_effective_keys = [];
      var advance = [];
      var restart = [];
      if (goog.isArray(out)) {
        // adv vector is given
        for (var i = 0; i < out.length; i++) {
          if (out[i] === true) {
            advance[i] = 1;
          } else if (out[i] === false) {
            restart[i] = true;
          } else {
            next_effective_keys[i] = out[i];
          }
        }
      } else if (goog.isNull(out)) {
        // all stop
        next_primary_keys = [];
      } else if (!goog.isDef(out)) {
        // all continue;
        next_primary_keys = [];
        for (var i = 0; i < iterators.length; i++) {
          if (goog.isDef(idx2iterator[i])) {
            advance[i] = 1;
          }
        }
      } else if (goog.isObject(out)) {
        if (goog.DEBUG) {
          var valid_att = ['advance', 'continue', 'continuePrimary', 'restart'];
          for (var key in out) {
            if (!goog.array.contains(valid_att, key)) {
              throw new ydn.debug.error.InvalidOperationException(
                  'Unknown attribute "' + key +
                  '" in cursor advancement object');
            }
          }
        }
        next_primary_keys = out['continuePrimary'] || [];
        next_effective_keys = out['continue'] || [];
        advance = out['advance'] || [];
        restart = out['restart'] || [];
      } else {
        throw new ydn.error.InvalidOperationException('scan callback output');
      }
      var move_count = 0;
      result_count = 0;
      for (var i = 0; i < iterators.length; i++) {
        if (goog.isDefAndNotNull(next_primary_keys[i]) ||
            goog.isDef(next_effective_keys[i]) ||
            goog.isDefAndNotNull(restart[i]) ||
            goog.isDefAndNotNull(advance[i])) {
          // by marking non moving iterator first, both async and sync callback
          // work.
        } else {
          // take non advancing iterator as already moved.
          result_count++;
        }
      }
      for (var i = 0; i < iterators.length; i++) {
        if (goog.isDefAndNotNull(next_primary_keys[i]) ||
            goog.isDef(next_effective_keys[i]) ||
            goog.isDefAndNotNull(restart[i]) ||
            goog.isDefAndNotNull(advance[i])) {
          var idx = idx2iterator[i];
          if (!goog.isDef(idx)) {
            throw new ydn.error.InvalidOperationException(i +
                ' is not an iterator.');
          }
          var iterator = iterators[idx];
          var cursor = cursors[i];
          if (goog.DEBUG && !goog.isDefAndNotNull(keys[i])) {
            var at = i + '/' + iterators.length;
            if (goog.isDefAndNotNull(advance[i])) {
              throw new ydn.error.InvalidOperationError(cursor + ' ' + at +
                  ' must not advance ' + advance[i] + ' steps');
            } else if (goog.isDef(next_effective_keys[i])) {
              throw new ydn.error.InvalidOperationError(cursor + ' ' + at +
                  ' must not continue to key ' + next_effective_keys[i]);
            } else if (goog.isDefAndNotNull(next_primary_keys[i])) {
              throw new ydn.error.InvalidOperationError(cursor + ' ' + at +
                  ' must not continue to primary key ' + next_primary_keys[i]);
            }
          }

          keys[i] = undefined;
          values[i] = undefined;

          if (goog.isDefAndNotNull(restart[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              window.console.log('cursor ' + cursor + ' of iterator ' +
                  iterator + ': restarting.');
            }
            goog.asserts.assert(restart[i] === true, i +
                ' restart must be true');
            cursor.restart();
          } else if (goog.isDef(next_effective_keys[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              window.console.log(iterator + ': continuing to ' +
                  next_effective_keys[i]);
            }
            cursor.continueEffectiveKey(next_effective_keys[i]);
          } else if (goog.isDefAndNotNull(next_primary_keys[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              window.console.log(cursor + ': continuing to primary key ' +
                  next_primary_keys[i]);
            }
            cursor.continuePrimaryKey(next_primary_keys[i]);
          } else if (goog.isDefAndNotNull(advance[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              window.console.log(iterator + ': advancing ' + advance[i] +
                  ' steps.');
            }
            goog.asserts.assert(advance[i] === 1, i +
                ' advance value must be 1');

            cursor.advance(1);
          } else {
            throw new ydn.error.InternalError(iterator + ': has no action');
          }
          move_count++;
        }
      }
      // console.log(['on_result_ready', move_count, keys, adv]);
      if (move_count == 0) {
        do_exit();
      }

    };

    /**
     * Received iterator result. When all iterators result are collected,
     * begin to send request to collect streamers results.
     * @param {number} i index.
     * @param {IDBKey=} opt_key effective key.
     */
    var on_iterator_next = function(i, opt_key) {
      if (done) {
        if (ydn.db.core.DbOperator.DEBUG) {
          window.console.log('iterator ' + i + ' done');
        }
        // calling next to a terminated iterator
        throw new ydn.error.InternalError();
      }
      result_count++;
      var is_result_ready = result_count === total;
      var idx = idx2iterator[i];
      /**
       * @type {!ydn.db.Iterator}
       */
      var iterator = iterators[idx];
      /**
       * @type {!ydn.db.Cursor}
       */
      var cursor = cursors[idx];
      var primary_key = cursor.getPrimaryKey();
      var value = cursor.getValue();
      if (ydn.db.core.DbOperator.DEBUG) {
        var key_str = opt_key +
            (goog.isDefAndNotNull(primary_key) ? ', ' + primary_key : '');
        var ready_str = is_result_ready ? ' (all result done)' : '';
        window.console.log(cursor + ' new position ' + key_str + ready_str);
      }

      keys[i] = opt_key;
      if (iterator.isIndexIterator()) {
        if (iterator.isKeyIterator()) {
          values[i] = primary_key;
        } else {
          values[i] = value;
        }
      } else {
        if (iterator.isKeyIterator()) {
          values[i] = opt_key;
        } else {
          values[i] = value;
        }
      }

      if (is_result_ready) { // receive all results
        on_result_ready();
      }

    };

    var on_error = function(e) {
      for (var k = 0; k < cursors.length; k++) {
        cursors[k].exit();
      }
      goog.array.clear(cursors);
      me.logger.finer(lbl + ' error');
      cb(e, true);
    };

    var open_iterators = function() {
      var idx = 0;
      for (var i = 0; i < iterators.length; i++) {
        var iterator = iterators[i];
        var cursor = iterator.iterate(tx, tx_no, me.getIndexExecutor());
        cursor.onFail = on_error;
        cursor.onNext = goog.partial(on_iterator_next, idx);
        cursors[i] = cursor;
        idx2iterator[idx] = i;
        idx++;
      }

      total = iterators.length;
    };

    if (solver instanceof ydn.db.algo.AbstractSolver) {
      var wait = solver.begin(iterators, function() {
        open_iterators();
      });
      if (!wait) {
        open_iterators();
      }
    } else {
      open_iterators();
    }

  }, scopes, tr_mode);

  return df;
};


/**
 * @return {ydn.db.core.req.IRequestExecutor} executor.
 */
ydn.db.core.DbOperator.prototype.getIndexExecutor = function() {
  return /** @type {ydn.db.core.req.IRequestExecutor} */ (this.getExecutor());
};


/**
 *
 * @param {Function} callback icursor handler.
 * @param {!ydn.db.Iterator} iter the cursor.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.core.DbOperator.prototype.open = function(callback, iter, opt_mode) {
  if (goog.DEBUG && !(iter instanceof ydn.db.Iterator)) {
    throw new ydn.debug.error.ArgumentException(
        'Second argument must be cursor range iterator.');
  }
  var store = this.schema.getStore(iter.getStoreName());
  if (!store) {
    throw new ydn.debug.error.ArgumentException('Store "' +
        iter.getStoreName() + '" not found.');
  }
  var tr_mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;
  var df = ydn.db.base.createDeferred();
  this.logger.finer('open:' + tr_mode + ' ' + iter);
  this.tx_thread.exec(df, function(tx, tx_no, cb) {
    var lbl = tx_no + ' iterating ' + iter;
    me.logger.finer(lbl);
    var cursor = iter.iterate(tx, tx_no, me.getIndexExecutor());

    cursor.onFail = function(e) {
      cb(e, true);
    };
    /**
     * callback.
     * @param {IDBKey=} opt_key effective key.
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDefAndNotNull(opt_key)) {
        var adv = callback(cursor);
        if (adv === true) {
          cursor.restart();
        } else if (goog.isObject(adv)) {
          if (adv['restart'] === true) {
            cursor.restart(adv['continue'], adv['continuePrimary']);
          } else if (goog.isDefAndNotNull(adv['continue'])) {
            cursor.continueEffectiveKey(adv['continue']);
          } else if (goog.isDefAndNotNull(adv['continuePrimary'])) {
            cursor.continuePrimaryKey(adv['continuePrimary']);
          } else {
            cursor.exit();
            cb(undefined); // break the loop
          }
        } else {
          cursor.advance(1);
        }
      } else {
        cursor.exit();
        cb(undefined);
      }
    };

  }, iter.stores(), tr_mode);

  return df;

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.map = function(iterator, callback) {

  var me = this;
  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.debug.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = ydn.db.base.createDeferred();
  this.logger.finest('map:' + iterator);
  this.tx_thread.exec(df, function(tx, tx_no, cb) {

    var lbl = tx_no + ' iterating ' + iterator;
    me.logger.finest(lbl);
    var cursor = iterator.iterate(tx, tx_no, me.getIndexExecutor());

    cursor.onFail = function(e) {
      cb(e, false);
    };
    /**
     *
     * @param {IDBKey=} opt_key effective key.
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDefAndNotNull(opt_key)) {
        var key = opt_key;
        var ref;
        if (iterator.isIndexIterator()) {
          if (iterator.isKeyIterator()) {
            ref = key;
          } else {
            ref = cursor.getPrimaryKey();
          }
        } else {
          if (iterator.isKeyIterator()) {
            ref = key;
          } else {
            ref = cursor.getValue();
          }
        }
        callback(ref);
        //console.log(['onNext', key, primaryKey, value, ref, adv]);
        cursor.advance(1);

      } else {
        cb(undefined);
        callback = null;
      }
    };

  }, stores, ydn.db.base.TransactionMode.READ_ONLY);

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.reduce = function(iterator, callback,
                                                   opt_initial) {

  var me = this;
  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.debug.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = ydn.db.base.createDeferred();

  var previous = goog.isObject(opt_initial) ?
      ydn.object.clone(opt_initial) : opt_initial;
  this.logger.finer('reduce:' + iterator);
  this.tx_thread.exec(df, function(tx, tx_no, cb) {

    var cursor = iterator.iterate(tx, tx_no, me.getIndexExecutor());

    /**
     *
     * @param {!Error} e error.
     */
    cursor.onFail = function(e) {
      cb(e, true);
    };
    var index = 0;
    /**
     *
     * @param {IDBKey=} opt_key effective key.
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDefAndNotNull(opt_key)) {
        var current_value;
        if (iterator.isIndexIterator()) {
          if (iterator.isKeyIterator()) {
            current_value = opt_key;
          } else {
            current_value = cursor.getPrimaryKey();
          }
        } else {
          if (iterator.isKeyIterator()) {
            current_value = opt_key;
          } else {
            current_value = cursor.getValue();
          }
        }

        //console.log([previous, current_value, index]);
        previous = callback(previous, current_value, index++);
        cursor.advance(1);
      } else {
        cb(previous);
      }
    };

  }, stores, ydn.db.base.TransactionMode.READ_ONLY);

  return df;
};





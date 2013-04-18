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
 * @fileoverview Provide iteration query.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.Storage');
goog.require('ydn.db.core.DbOperator');
goog.require('ydn.db.crud.Storage');



/**
 * Construct storage providing atomic CRUD database operations on implemented
 * storage mechanisms.
 *
 * This class do not execute database operation, but create a non-overlapping
 * transaction queue on ydn.db.crud.DbOperator and all operations are
 * passed to it.
 *
 *
 * @param {string=} opt_dbname database name.
 * @param {(!ydn.db.schema.Database|!DatabaseSchema)=} opt_schema database
 * schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * @param {!StorageOptions=} opt_options options.
 * @extends {ydn.db.crud.Storage}
 * @implements {ydn.db.core.IOperator}
 * @constructor
 */
ydn.db.core.Storage = function(opt_dbname, opt_schema, opt_options) {

  goog.base(this, opt_dbname, opt_schema, opt_options);

};
goog.inherits(ydn.db.core.Storage, ydn.db.crud.Storage);


///**
// * @override
// */
//ydn.db.core.Storage.prototype.newTxQueue = function(thread, scope_name) {
//  thread = thread || this.thread;
//  return new ydn.db.core.DbOperator(this, thread, this.ptx_no++,
//      this.schema, scope_name);
//};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.newExecutor = function() {

  var type = this.getType();
  if (type == ydn.db.base.Mechanisms.IDB) {
    return new ydn.db.core.req.IndexedDb(this.db_name, this.schema);
  } else if (type == ydn.db.base.Mechanisms.WEBSQL) {
    return new ydn.db.core.req.WebSql(this.db_name, this.schema);
  } else if (type == ydn.db.base.Mechanisms.MEMORY_STORAGE ||
      type == ydn.db.base.Mechanisms.LOCAL_STORAGE ||
      type == ydn.db.base.Mechanisms.SESSION_STORAGE) {
    return new ydn.db.core.req.SimpleStore(this.db_name, this.schema);
  } else {
    throw new ydn.db.InternalError('No executor for ' + type);
  }

};


/**
 * Create a new operator.
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.newOperator = function(tx_thread, sync_thread) {
  return new ydn.db.core.DbOperator(this, this.schema, tx_thread, sync_thread);
};


/**
 * Get casted operator.
 * @return {ydn.db.core.DbOperator} casted operator.
 */
ydn.db.core.Storage.prototype.getIndexOperator = function() {
  return /** @type {ydn.db.core.DbOperator} */ (this.db_operator);
};


/**
 *
 * @param {!ydn.db.Iterator} iterator the cursor.
 * @param {Function} callback icursor handler.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.core.Storage.prototype.open = function(iterator, callback, opt_mode) {
  return this.getIndexOperator().open(iterator, callback, opt_mode);
};


/**
 * Cursor scan iteration.
 * @param {!Array.<!ydn.db.Iterator>} iterators the cursor.
 * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): !Array} solver
 * solver.
 * @param {!Array.<!ydn.db.Streamer>=} streamers streamers.
 * @return {!goog.async.Deferred} promise on completed.
 */
ydn.db.core.Storage.prototype.scan = function(iterators, solver, streamers) {
  return this.getIndexOperator().scan(iterators, solver, streamers);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.map = function(iterator, callback) {
  return this.getIndexOperator().map(iterator, callback);
};


/**
 * @inheritDoc
 */
ydn.db.core.Storage.prototype.reduce = function(iterator, callback,
                                                opt_initial) {
  return this.getIndexOperator().reduce(iterator, callback, opt_initial);
};


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
 * @fileoverview Provide package variables.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db');
goog.provide('ydn.db.YdnDbValidKeyException');
goog.provide('ydn.db.YdnDbInvalidStateException');



/**
 * Column name of key, if keyPath is not specified.
 * @const {string}
 */
ydn.db.DEFAULT_KEY_COLUMN = '_id_';


/**
 * Non-indexed field are store in this default field. There is always a column
 * in each table.
 * @const {string}
 */
ydn.db.DEFAULT_BLOB_COLUMN = '_default_';


/**
 * Event types the Transaction can dispatch. COMPLETE events are dispatched
 * when the transaction is committed. If a transaction is aborted it dispatches
 * both an ABORT event and an ERROR event with the ABORT_ERR code. Error events
 * are dispatched on any error.
 *
 * @see {@link goog.db.Transaction.EventTypes}
 *
 * @enum {string}
 */
ydn.db.TransactionEventTypes = {
  COMPLETE: 'complete',
  ABORT: 'abort',
  ERROR: 'error'
};


/**
 * The three possible transaction modes.
 * @see http://www.w3.org/TR/IndexedDB/#idl-def-IDBTransaction
 * @enum {string|number}
 */
ydn.db.TransactionMode = {
  READ_ONLY: 'readonly',
  READ_WRITE: 'readwrite',
  VERSION_CHANGE: 'versionchange'
};


/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.YdnDbValidKeyException = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.YdnDbValidKeyException);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.YdnDbValidKeyException, Error);

ydn.db.YdnDbValidKeyException.prototype.name = 'ValidKeyException';




/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.YdnDbInvalidStateException = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.YdnDbInvalidStateException);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.YdnDbInvalidStateException, Error);

ydn.db.YdnDbInvalidStateException.prototype.name = 'WrapperDBInvalidStateException';




/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.NotFoundError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.NotFoundError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.NotFoundError, Error);

ydn.db.NotFoundError.prototype.name = 'ydn.db.NotFoundError';

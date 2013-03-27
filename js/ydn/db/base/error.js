/**
 * @fileoverview Error classes for the database module.
 */

goog.provide('ydn.db.InternalError');
goog.provide('ydn.db.InvalidKeyException');
goog.provide('ydn.db.InvalidStateError');
goog.provide('ydn.db.NotFoundError');
goog.provide('ydn.db.ScopeError');
goog.provide('ydn.db.SecurityError');
goog.provide('ydn.db.TimeoutError');




/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InvalidKeyException = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InvalidKeyException);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ydn.db.InvalidKeyException';
};
goog.inherits(ydn.db.InvalidKeyException, Error);

///**
// * @type {string} name of error.
// */
//ydn.db.InvalidKeyException.prototype.name = 'ydn.db.InvalidKeyException';



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InternalError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InternalError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.InternalError, Error);

/**
 * @type {string} name of error.
 */
ydn.db.InternalError.prototype.name = 'ydn.db.InternalError';


/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.ScopeError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.ScopeError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ydn.db.ScopeError';
};
goog.inherits(ydn.db.ScopeError, Error);
//
///**
// * @type {string} name of error.
// */
//ydn.db.ScopeError.prototype.name = 'ydn.db.ScopeError';


/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InvalidStateError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InvalidStateError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'InvalidStateError';
};
goog.inherits(ydn.db.InvalidStateError, Error);

///**
// * @type {string} name of error.
// */
//ydn.db.InvalidStateError.prototype.name = 'InvalidStateError';


/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InvalidAccessError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InvalidAccessError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'InvalidAccessError';
};
goog.inherits(ydn.db.InvalidAccessError, Error);
//
///**
// * @type {string} name of error.
// */
//ydn.db.InvalidAccessError.prototype.name = 'InvalidAccessError';


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
  this.name = 'NotFoundError';
};
goog.inherits(ydn.db.NotFoundError, Error);

/**
* @type {string} name of error.
*/
ydn.db.NotFoundError.prototype.name = 'NotFoundError';


/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.DataCloneError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.DataCloneError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'DataCloneError';
};
goog.inherits(ydn.db.DataCloneError, Error);

///**
// * @type {string} name of error.
// */
//ydn.db.DataCloneError.prototype.name = 'DataCloneError';


/**
 *
 * @param {SQLError} e original error.
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.SQLError = function(e, opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.SQLError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.message += ' :' + e.message + ' [' + e.code + ']';
  this.name = 'SQLError';
};
goog.inherits(ydn.db.SQLError, Error);

///**
// * @type {string} name of error.
// */
//ydn.db.SQLError.prototype.name = 'SQLError';


/**
 *
 * @param {Error} e original message.
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.SecurityError = function(e, opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.SecurityError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.message += ' :' + e.message;
  this.name = 'SecurityError';
};
goog.inherits(ydn.db.SecurityError, Error);

///**
// * @type {string} name of error.
// */
//ydn.db.SecurityError.prototype.name = 'SecurityError';



/**
 *
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.SqlParseError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.SqlParseError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ydn.db.SqlParseError';
};
goog.inherits(ydn.db.SqlParseError, Error);

/**
 *
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.TimeoutError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.TimeoutError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ydn.db.TimeoutError';
};
goog.inherits(ydn.db.TimeoutError, Error);

/**
 * @param {*} result request result.
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.TxError = function(result, opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.TxError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'TxError';
  this.result = result;
};
goog.inherits(ydn.db.TxError, Error);

/**
 * @type {*}
 */
ydn.db.TxError.prototype.result;

/**
 * @return {*} request result
 */
ydn.db.TxError.prototype.getResult = function() {
  return this.result;
};


/**
 *
 * @param {*} result request result.
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {ydn.db.TxError}
 */
ydn.db.TxAbortedError = function(result, opt_msg) {
  goog.base(this, result, opt_msg);
  this.name = 'TxAbortedError';
};
goog.inherits(ydn.db.TxAbortedError, ydn.db.TxError);




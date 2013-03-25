/**
 * @fileoverview Database index schema.
 *
 * User: kyawtun
 * Date: 24/2/13
 */


goog.provide('ydn.db.schema.Index');
goog.provide('ydn.db.schema.DataType');
goog.require('ydn.db.base');
goog.require('ydn.debug.error.ArgumentException');
goog.require('ydn.db.utils');


/**
 * Schema for index.
 *
 * @param {string|!Array.<string>} keyPath the key path.
 * @param {!Array.<ydn.db.schema.DataType>|string|ydn.db.schema.DataType=} opt_type to be determined.
 * @param {boolean=} opt_unique True if the index enforces that there is only
 * one objectfor each unique value it indexes on.
 * @param {boolean=} multiEntry  specifies whether the index's multiEntry flag
 * is set.
 * @param {string=} name index name.
 * @constructor
 */
ydn.db.schema.Index = function(
    keyPath, opt_type, opt_unique, multiEntry, name) {

  if (!goog.isDef(name)) {
    if (goog.isArray(keyPath)) {
      name = keyPath.join(', ');
    } else {
      name = keyPath;
    }
  }

  if (goog.isDefAndNotNull(keyPath) && !goog.isString(keyPath) &&
    !goog.isArrayLike(keyPath)) {
    throw new ydn.debug.error.ArgumentException('index keyPath for ' + name +
        ' must be a string or array, but ' + keyPath + ' is ' + typeof keyPath);
  }

  if (goog.DEBUG && goog.isArray(keyPath) && Object.freeze) {
    // NOTE: due to performance penalty (in Chrome) of using freeze and
    // hard to debug on different browser we don't want to use freeze
    // this is experimental.
    // http://news.ycombinator.com/item?id=4415981
    Object.freeze(/** @type {!Object} */ (keyPath));
  }

  if (!goog.isDef(keyPath) && goog.isDef(name)) {
    keyPath = name;
  }

  /**
   * @final
   */
  this.keyPath = keyPath;

  /**
   * @final
   */
  this.name = name;
  /**
   * @final
   * @type {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined}
   */
  this.type = ydn.db.schema.Index.toType(opt_type);
  if (goog.DEBUG &&
      (
          (goog.isArray(opt_type) && !goog.isArray(this.type)) ||
              (goog.isArray(opt_type) && !goog.array.equals(
                  /** @type {Array} */ (this.type), opt_type)) ||
              (!goog.isArray(opt_type) && this.type != opt_type)
          )
      ) {
    throw new ydn.debug.error.ArgumentException('Invalid index type: ' +
        opt_type + ' in ' + this.name);
  }
  /**
   * @final
   */
  this.unique = !!opt_unique;

  /**
   * @final
   */
  this.multiEntry = !!multiEntry;
  /**
   * @final
   */
  this.keyColumnType_ = goog.isString(this.type) ? this.type :
      ydn.db.schema.DataType.TEXT;
  /**
   * @final
   */
  this.index_column_name_ = goog.isArray(name) ?
      goog.string.quote(name) :
      goog.isArray(keyPath) ?
          this.keyPath.join(',') : keyPath;

  this.index_column_name_quoted_ = goog.string.quote(this.index_column_name_);
};


/**
 * Extract value of keyPath from a given object.
 * @see #getKeyValue
 * @param {!Object} obj object to extract from.
 * @return {!Array|number|string|undefined} return key value.
 */
ydn.db.schema.Index.prototype.getKeyValue = function(obj) {
  if (goog.isDefAndNotNull(obj)) {
    if (goog.isArrayLike(this.keyPath)) {
      var key = [];
      for (var i = 0, n = this.keyPath.length; i < n; i++) {
        key[i] = ydn.db.utils.getValueByKeys(obj, this.keyPath[i]);
      }
      return key;
    } else {
      return /** @type {!Array|number|string|undefined} */ (ydn.db.utils.getValueByKeys(obj, this.keyPath));
    }
  }
};


/**
 * @type {string}
 */
ydn.db.schema.Index.prototype.name;

/**
 * @private
 * @type {ydn.db.schema.DataType}
 */
ydn.db.schema.Index.prototype.keyColumnType_;

/**
 * @type {(string|!Array.<string>)}
 */
ydn.db.schema.Index.prototype.keyPath;

/**
 * @type {boolean}
 */
ydn.db.schema.Index.prototype.multiEntry;

/**
 * @type {boolean}
 */
ydn.db.schema.Index.prototype.unique;


/**
 * Data type for field in object store. This is required to compatible between
 * IndexedDB and SQLite.
 * SQLite mandate COLUMN field specified data type.
 * IndexedDB allow Array as data type in key, while SQLite is not to use.
 * @see http://www.w3.org/TR/IndexedDB/#key-construct
 * @see http://www.sqlite.org/datatype3.html
 * @see http://www.sqlite.org/lang_expr.html
 * @enum {string}
 */
ydn.db.schema.DataType = {
  BLOB: 'BLOB',
  DATE: 'DATE',
  INTEGER: 'INTEGER', // AUTOINCREMENT is only allowed on an INTEGER
  NUMERIC: 'NUMERIC',
  TEXT: 'TEXT'
};


/**
 * This data type abbreviation is used to prefix value of
 * ydn.db.schema.DataType.ARRAY
 * on storage.
 * @see http://www.sqlite.org/datatype3.html
 * @enum {string}
 */
ydn.db.DataTypeAbbr = {
  DATE: 'd',
  NUMERIC: 'n',
  TEXT: 't'
};


/**
 * Seperator char for array
 * @const
 * @type {string}
 */
ydn.db.schema.Index.ARRAY_SEP = '|'; // String.fromCharCode(0x001F);


/**
 * Convert key value from IndexedDB value to Sqlite for storage.
 * @see #sql2js
 * @param {Array|Date|*} key key.
 * @param {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} type data type.
 * @return {*} string.
 */
ydn.db.schema.Index.js2sql = function(key, type) {
  if (goog.isArray(type)) {
    // NOTE: we are storing these value for indexing purpose.
    // Array is not native to Sqlite. To be multiEntry searchable,
    // array values are store as TEXT and search using LIKE %q%
    // where q is ARRAY_SEP + search_term + ARRAY_SEP
    // for type preserve conversion, type information is prepended at the
    // front with ydn.db.DataTypeAbbr.
    var arr = !goog.isDefAndNotNull(key) ? [''] :
        goog.isArray(key) ? key : [key];
    var t = ydn.db.schema.Index.toAbbrType(arr[0]);
    var value = (t == ydn.db.DataTypeAbbr.DATE) ?
        arr.reduce(function(p, x) {return p + (+x);}, '') :
        arr.join(ydn.db.schema.Index.ARRAY_SEP);
    return t + ydn.db.schema.Index.ARRAY_SEP +
        value + ydn.db.schema.Index.ARRAY_SEP;
  } else if (type == ydn.db.schema.DataType.DATE) {
    if (key instanceof Date) {
      return +key;  // date is store as NUMERIC
    } // else ?
  } else if (goog.isDef(type)) {
    return key; // NUMERIC, INTEGER, and BLOB
  } else {
    return ydn.db.utils.encodeKey(key);
  }
};


/**
 * Convert key value from Sqlite value to IndexedDB for storage.
 * @see #js2sql
 * @param {string|number|*} key key.
 * @param {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} type type.
 * @return {Date|Array|*} decoded key.
 */
ydn.db.schema.Index.sql2js = function(key, type) {
  if (goog.isArray(type)) {
    if (goog.isString(key)) {
      /**
       * @type {string}
       */
      var s = key;
      var arr = s.split(ydn.db.schema.Index.ARRAY_SEP);
      var t = arr[0];
      var effective_arr = arr.slice(1, arr.length - 1); // remove last and first
      return goog.array.map(effective_arr, function(x) {
        if (t == ydn.db.DataTypeAbbr.DATE) {
          return new Date(parseInt(x, 10));
        } else if (t == ydn.db.DataTypeAbbr.NUMERIC) {
          return parseFloat(x);
        } else {
          return x;
        }
      });
    } else {
      return undefined;
    }
  } else if (type == ydn.db.schema.DataType.DATE) {
    return new Date(key); // key is number
  } else if (goog.isDef(type)) {
    return key;   // NUMERIC, INTEGER,
  } else {
    return ydn.db.utils.decodeKey(/** @type {string} */ (key));
  }
};


/**
 * @const
 * @type {!Array.<ydn.db.schema.DataType>} column data type.
 */
ydn.db.schema.Index.TYPES = [
  ydn.db.schema.DataType.BLOB,
  ydn.db.schema.DataType.DATE,
  ydn.db.schema.DataType.INTEGER,
  ydn.db.schema.DataType.NUMERIC,
  ydn.db.schema.DataType.TEXT];


/**
 * Return an immutable type.
 * @param {!Array|ydn.db.schema.DataType|string=} str data type in string.
 * @return {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined}
 * data type.
 */
ydn.db.schema.Index.toType = function(str) {
  if (goog.isArray(str)) {
    var out = goog.array.map(str, function(s) {
      return ydn.db.schema.Index.toType(s);
    });
    if (goog.DEBUG && Object.freeze) {
      Object.freeze(/** @type {!Object} */ (out));
    }
    return out;
  } else {
    var idx = goog.array.indexOf(ydn.db.schema.Index.TYPES, str);
    return ydn.db.schema.Index.TYPES[idx]; // undefined OK.
  }

};


/**
 *
 * @param {*} x object to test.
 * @return {ydn.db.DataTypeAbbr} type of object type.
 */
ydn.db.schema.Index.toAbbrType = function(x) {
  if (x instanceof Date) {
    return ydn.db.DataTypeAbbr.DATE;
  } else if (goog.isNumber(x)) {
    return ydn.db.DataTypeAbbr.NUMERIC;
  } else {
    return ydn.db.DataTypeAbbr.TEXT;
  }
};


/**
 * Return type.
 * @return {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} data type.
 */
ydn.db.schema.Index.prototype.getType = function() {
  return this.type;
};


/**
 *
 * @return {ydn.db.schema.DataType}
 */
ydn.db.schema.Index.prototype.getSqlType = function() {
  return this.keyColumnType_;
};


/**
 *
 * @return {string} index name.
 */
ydn.db.schema.Index.prototype.getName = function() {
  return this.name;
};


/**
 *
 * @return {boolean} multiEntry or not.
 */
ydn.db.schema.Index.prototype.isMultiEntry = function() {
  return this.multiEntry;
};

/**
 *
 * @return {boolean} unique or not.
 */
ydn.db.schema.Index.prototype.isUnique = function() {
  return this.unique;
};



/**
 * @inheritDoc
 */
ydn.db.schema.Index.prototype.toJSON = function() {
  return {
    'name': this.name,
    'keyPath': this.keyPath,
    'type': this.type,
    'unique': this.unique,
    'multiEntry': this.multiEntry
  };
};



/**
 *
 * @return {!ydn.db.schema.Index} a clone.
 */
ydn.db.schema.Index.prototype.clone = function() {
  var keyPath = goog.isArray(this.keyPath) ?
    goog.array.clone(/** @type {goog.array.ArrayLike} */ (this.keyPath)) :
      this.keyPath;
  var type = goog.isArray(this.type) ?
    goog.array.clone(/** @type {goog.array.ArrayLike} */ (this.type)) :
      this.type;
  return new ydn.db.schema.Index(
    keyPath,
    type,
    this.unique,
    this.multiEntry,
    this.name);
};


/**
 * Compare two keyPath.
 * @see #equals
 * @param {*} keyPath1 key path 1.
 * @param {*} keyPath2 key path 1.
 * @return {string?} description where is different between the two. null
 * indicate similar schema.
 */
ydn.db.schema.Index.compareKeyPath = function(keyPath1, keyPath2) {
  if (!goog.isDefAndNotNull(keyPath1) && !goog.isDefAndNotNull(keyPath2)) {
    return null;
  } else if (!goog.isDefAndNotNull(keyPath1)) {
    return 'newly define ' + keyPath2;
  } else if (!goog.isDefAndNotNull(keyPath2)) {
    return 'keyPath: ' + keyPath1 + ' no longer defined';
  } else if (goog.isArrayLike(keyPath1) && goog.isArrayLike(keyPath2)) {
    return goog.array.equals(/** @type {goog.array.ArrayLike} */ (keyPath1),
        /** @type {goog.array.ArrayLike} */ (keyPath2)) ?
        null : 'expect: ' + keyPath1 + ', but: ' + keyPath2;
  } else if (!ydn.object.equals(keyPath1, keyPath2)) {
    return 'expect: ' + keyPath1 + ', but: ' + keyPath2;
  } else {
    return null;
  }
};


/**
 * Compare two stores.
 * @see #equals
 * @param {ydn.db.schema.Index} index index schema to test.
 * @return {string} description where is different between the two. Empty string
 * indicate similar schema.
 */
ydn.db.schema.Index.prototype.difference = function(index) {
  if (!index) {
    return 'no index for ' + this.name;
  }
  if (this.name != index.name) {
    return 'name, expect: ' + this.name + ', but: ' + index.name;
  }
  var msg = ydn.db.schema.Index.compareKeyPath(this.keyPath, index.keyPath);
  if (msg) {
    return 'keyPath, ' + msg;
  }
  if (goog.isDefAndNotNull(this.unique) &&
      goog.isDefAndNotNull(index.unique) &&
      this.unique != index.unique) {
    return 'unique, expect: ' + this.unique + ', but: ' + index.unique;
  }
  if (goog.isDefAndNotNull(this.multiEntry) &&
      goog.isDefAndNotNull(index.multiEntry) &&
      this.multiEntry != index.multiEntry) {
    return 'multiEntry, expect: ' + this.multiEntry +
      ', but: ' + index.multiEntry;
  }
  if (goog.isDef(this.type) && goog.isDef(index.type) &&
      (goog.isArrayLike(this.type) ? !goog.array.equals(
        /** @type {goog.array.ArrayLike} */ (this.type),
        /** @type {goog.array.ArrayLike} */ (index.type)) :
        this.type != index.type)) {
    return 'data type, expect: ' + this.type + ', but: ' + index.type;
  }
  return '';
};


/**
 *
 * @return {boolean} true if keyPath is an array.
 */
ydn.db.schema.Index.prototype.isArrayKeyPath = function() {
  return goog.isArray(this.keyPath);
};



/**
 * Create a new update index schema with given guided index schema.
 * NOTE: This is used in websql for checking table schema sniffed from the
 * connection is similar to requested table schema. The fact is that
 * some schema information are not able to reconstruct from the connection,
 * these include:
 *   1. composite index: in which a composite index is blown up to multiple
 *     columns. @see ydn.db.con.WebSql.prototype.prepareTableSchema_.
 * @param {ydn.db.schema.Index} that guided index schema
 * @return {!ydn.db.schema.Index} updated index schema
 */
ydn.db.schema.Index.prototype.hint = function(that) {
  if (!that) {
    return this;
  }
  goog.asserts.assert(this.name == that.name);
  var keyPath = goog.isArray(this.keyPath) ?
    goog.array.clone(/** @type {goog.array.ArrayLike} */ (this.keyPath)) :
    this.keyPath;
  var type = goog.isArray(this.type) ?
    goog.array.clone(/** @type {goog.array.ArrayLike} */ (this.type)) :
    this.type;
  var multiEntry = this.multiEntry;
  if (that.multiEntry === true && this.type == 'TEXT') {
    multiEntry = true; // multiEntry info was lost
  }
  return new ydn.db.schema.Index(keyPath, type, this.unique, multiEntry,
    that.name);
};


/**
 *
 * @param {ydn.db.base.Direction|string=} str direction in string format.
 * @return {ydn.db.base.Direction|undefined} equivalent typed direction.
 */
ydn.db.schema.Index.toDir = function(str) {
  var idx = goog.array.indexOf(ydn.db.base.DIRECTIONS, str);
  return ydn.db.base.DIRECTIONS[idx]; // undefined OK.
};



/**
 *
 * @return {(string|!Array.<string>)} keyPath
 */
ydn.db.schema.Index.prototype.getKeyPath = function() {
  return this.keyPath;
};



/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath. If keyPath is array, they are
 * join by ',' and quoted. If keyPath is not define, default sqlite column
 * name is used.
 */
ydn.db.schema.Index.prototype.getSQLIndexColumnName = function () {
  return this.index_column_name_;
};


/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath. If keyPath is array, they are
 * join by ',' and quoted. If keyPath is not define, default sqlite column
 * name is used.
 */
ydn.db.schema.Index.prototype.getSQLIndexColumnNameQuoted = function () {
  return this.index_column_name_quoted_;
};


/**
 * @type {string}
 * @private
 */
ydn.db.schema.Index.prototype.index_column_name_;



/**
 * @type {string}
 * @private
 */
ydn.db.schema.Index.prototype.index_column_name_quoted_;



/**
 *
 * @param {!IndexSchema} json object in json format.
 * @return {ydn.db.schema.Index} created from input json string.
 */
ydn.db.schema.Index.fromJSON = function(json) {
  if (goog.DEBUG) {
    var fields = ['name', 'unique', 'type', 'keyPath', 'multiEntry'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown field: ' + key + ' in ' +
            ydn.json.stringify(json));
      }
    }
  }
  return new ydn.db.schema.Index(json.keyPath, json.type, json.unique,
      json.multiEntry, json.name);
};


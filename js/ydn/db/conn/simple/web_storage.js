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
 * @fileoverview Web storage connectors.
 */

goog.provide('ydn.db.con.LocalStorage');
goog.provide('ydn.db.con.SessionStorage');
goog.require('ydn.db.con.SimpleStorage');



/**
 * @extends {ydn.db.con.SimpleStorage}
 * name and keyPath.
 * @constructor
 * @struct
 */
ydn.db.con.LocalStorage = function() {
  goog.asserts.assertObject(window.localStorage);
  goog.base(this, window.localStorage);
};
goog.inherits(ydn.db.con.LocalStorage, ydn.db.con.SimpleStorage);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.con.LocalStorage.isSupported = function() {
  return !!window.localStorage;
};


/**
 * @inheritDoc
 */
ydn.db.con.LocalStorage.prototype.getType = function() {
  return ydn.db.base.Mechanisms.LOCAL_STORAGE;
};


/**
 *
 * @param {string} db_name
 */
ydn.db.con.LocalStorage.deleteDatabase = function(db_name) {
  var db = new ydn.db.con.LocalStorage();
  var schema = new ydn.db.schema.EditableDatabase();
  db.connect(db_name, schema);
  db.getSchema(function(sch) {
    for (var i = 0; i < sch.stores.length; i++) {
      var store = db.getSimpleStore(sch.stores[i].name);
      store.clear();
    }
  });

};



/**
 * @extends {ydn.db.con.SimpleStorage}
 * name and keyPath.
 * @constructor
 * @struct
 */
ydn.db.con.SessionStorage = function() {
  goog.asserts.assertObject(window.sessionStorage);
  goog.base(this, window.sessionStorage);
};
goog.inherits(ydn.db.con.SessionStorage, ydn.db.con.SimpleStorage);


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.con.SessionStorage.isSupported = function() {
  return !!window.sessionStorage;
};


/**
 * @inheritDoc
 */
ydn.db.con.SessionStorage.prototype.getType = function() {
  return ydn.db.base.Mechanisms.SESSION_STORAGE;
};


/**
 *
 * @param {string} db_name
 */
ydn.db.con.SessionStorage.deleteDatabase = function(db_name) {
  var db = new ydn.db.con.SessionStorage();
  var schema = new ydn.db.schema.EditableDatabase();
  db.connect(db_name, schema);
  db.getSchema(function(sch) {
    for (var i = 0; i < sch.stores.length; i++) {
      var store = db.getSimpleStore(sch.stores[i].name);
      store.clear();
    }
  });
};



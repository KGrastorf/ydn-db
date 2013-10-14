/**
 * @license Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");.
 */
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
 * @fileoverview Injdect storage mechanism for IndexedDB, WebSql, WebStorage
 * and UserData.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.tr.Storage.wu');
goog.require('ydn.db.con.LocalStorage');
goog.require('ydn.db.con.SessionStorage');
goog.require('ydn.db.con.SimpleStorage');
goog.require('ydn.db.con.simple.UserData');
goog.require('ydn.db.tr.Storage');


/**
 * Create database instance.
 * @protected
 * @param {string} db_type database type.
 * @return {ydn.db.con.IDatabase} newly created database instance.
 */
ydn.db.tr.Storage.prototype.createDbInstance = function(db_type) {

  if (db_type == ydn.db.base.Mechanisms.LOCAL_STORAGE &&
      ydn.db.con.LocalStorage.isSupported()) {
    return new ydn.db.con.LocalStorage();
  } else if (db_type == ydn.db.base.Mechanisms.SESSION_STORAGE &&
      ydn.db.con.SessionStorage.isSupported()) {
    return new ydn.db.con.SessionStorage();
  } else if (db_type == ydn.db.base.Mechanisms.MEMORY_STORAGE) {
    return new ydn.db.con.SimpleStorage();
  } else if (db_type == ydn.db.base.Mechanisms.USER_DATA) {
    return new ydn.db.con.simple.UserData();
  }
  return null;
};

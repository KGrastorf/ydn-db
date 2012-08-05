/**
 * @fileoverview JsTestDriver test unit for ydn.store.Storage.
 */

goog.provide('ydn.store.StorageJstest');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.Storage');
goog.require('ydn.db.test');


ydn.store.StorageJstest = AsyncTestCase('StorageJstest');

ydn.store.StorageJstest.prototype.setUp = function() {
  //console.log('running test for PageJstest');

  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.Storage').setLevel(goog.debug.Logger.Level.FINEST);
  goog.debug.Logger.getLogger('ydn.db.IndexedDb').setLevel(goog.debug.Logger.Level.FINEST);

  this.dbname = 'storage_test';
  this.table = 'test';
  this.schema = {};
  this.schema[this.table] = {'keyPath': 'id'};
};


ydn.store.StorageJstest.prototype.test_setItem = function(queue) {
  var db = new ydn.db.Storage(this.dbname + '1');

  queue.call('not initialized', function(callbacks) {
    assertUndefined('not initialized', db.db);
  });

  queue.call('set schema', function(callbacks) {
    db.setSchema({}, '1');
  });

  queue.call('initialized', function(callbacks) {
    assertNotUndefined('db initialized', db.db);
  });

  queue.call('put a', function(callbacks) {
    db.setItem('a', '1').addBoth(callbacks.add(function(value) {
      assertTrue('put a OK', value);
    }));
  });

};


/**
 * Test database can be use before initialized.
 * @param queue
 */
ydn.store.StorageJstest.prototype.test_setItem_getItem = function(queue) {
  var db = new ydn.db.Storage(this.dbname + '2');

  var v = 'a' + Math.random();
  db.setItem('a', v); // using db before initialized.

  queue.call('not initialized', function(callbacks) {
    assertUndefined('not initialized', db.db);
  });

  queue.call('set schema', function(callbacks) {
    db.setSchema({}, '1');
  });

  queue.call('initialized', function(callbacks) {
    assertNotUndefined('db initialized', db.db);
  });

  queue.call('get a', function(callbacks) {
    db.getItem('a').addBoth(callbacks.add(function(value) {
      assertEquals('get a OK', v, value);
    }));
  });

  // to make sure transaction can continue.
  queue.call('get a again', function(callbacks) {
    db.getItem('a').addBoth(callbacks.add(function(value) {
      assertEquals('get a again', v, value);
    }));
  });

  queue.call('get b', function(callbacks) {
    db.getItem('b').addBoth(callbacks.add(function(value) {
      assertUndefined('no b', value);
    }));
  });

  queue.call('get a again 2', function(callbacks) {
    db.getItem('a').addBoth(callbacks.add(function(value) {
      assertEquals('get a again 2', v, value);
    }));
  });
};



/**
 * Test database can be use before initialized.
 * @param queue
 */
ydn.store.StorageJstest.prototype.test_put_get = function(queue) {
  var db = new ydn.db.Storage(this.dbname + '3');
  var self = this;

  var v = {'id': 'a', 'value': 'a' + Math.random()};
  db.put(this.table, v); // using db before initialized.

  queue.call('not initialized', function(callbacks) {
    assertUndefined('not initialized', db.db);
  });

  queue.call('set schema', function(callbacks) {
    db.setSchema(self.schema, '1');
  });

  queue.call('initialized', function(callbacks) {
    assertNotUndefined('db initialized', db.db);
  });

  queue.call('get a', function(callbacks) {
    db.get(self.table, 'a').addBoth(callbacks.add(function(value) {
      assertEquals('get a OK', v, value);
    }));
  });

  // to make sure transaction can continue.
  queue.call('get a again', function(callbacks) {
    db.get(self.table, 'a').addBoth(callbacks.add(function(value) {
      assertEquals('get a again', v, value);
    }));
  });

  queue.call('get b', function(callbacks) {
    db.get(self.table, 'b').addBoth(callbacks.add(function(value) {
      assertUndefined('no b', value);
    }));
  });

  queue.call('get a again 2', function(callbacks) {
    db.get(self.table, 'a').addBoth(callbacks.add(function(value) {
      assertEquals('get a again 2', v, value);
    }));
  });
};




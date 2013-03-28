var options = {}; // options = {mechanisms: ['websql']};
if (/log/.test(location.hash)) {
  var level = /finest/.test(location.hash) ? 'finest' : 'finer';
  if (/ui/.test(location.hash)) {
    if (ydn.debug && ydn.debug.log) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      ydn.debug.log('ydn.db', level, div);
    } else {
      console.log('no logging facility');
    }
  } else {
    if (ydn.debug && ydn.debug.log) {
      ydn.debug.log('ydn.db', level);
    } else {
      console.log('no logging facility');
    }
  }
}
if (/websql/.test(location.hash)) {
  options['mechanisms'] = ['websql'];
}


var db;
var db_name_event = "tck_test_1_1";
var store_inline = "ts";    // in-line key store
var store_outline = "ts2"; // out-of-line key store


var events_schema = {
  stores: [
    {
      name: store_inline,
      keyPath: 'id',
      dispatchEvents: true,
      type: 'NUMERIC'},
    {
      name: store_outline,
      dispatchEvents: true,
      type: 'NUMERIC'}
  ]};

(function () {

  var db_name_event = 'test_tb' + Math.random();
  db_name_event = db_name_event.replace('.', '');
  var schema = {stores: [
    {
      name: store_inline
    }
  ]};

  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('Storage Event test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Storage Event", test_env);

  asyncTest("connected to a new database and existing", 15, function () {

    var db = new ydn.db.Storage(db_name_event, schema);

    db.addEventListener('ready', function (e) {
      equal(e.name, 'StorageEvent', 'event name');
      equal(e.type, 'ready', 'event type');
      equal(e.getVersion(), 1, 'version number');
      equal(e.getError(), null, 'no error');
      ok(isNaN(e.getOldVersion()), 'old version number');

      db.values(store_inline).always(function () {

        db.close();

        db = new ydn.db.Storage(db_name_event, schema);

        db.addEventListener('ready', function (e) {
          equal(e.name, 'StorageEvent', 'event name');
          equal(e.type, 'ready', 'event type');
          equal(e.getVersion(), 1, 'version number');
          equal(e.getOldVersion(), 1, 'old version number, existing');
          equal(e.getError(), null, 'no error');
          db.values(store_inline).always(function () {

            db.close();

            var tb_name = 'new_tb' + Math.random();
            tb_name = tb_name.replace('.', '');
            var new_schema = {stores: [
              {
                name: tb_name
              }
            ]};

            db = new ydn.db.Storage(db_name_event, new_schema);

            db.addEventListener('ready', function (e) {
              equal(e.name, 'StorageEvent', 'event name');
              equal(e.type, 'ready', 'event type');
              equal(e.getVersion(), 2, 'updated version number');
              equal(e.getOldVersion(), 1, 'old version number, existing db, new schema');
              equal(e.getError(), null, 'no error');
              var type = db.getType();
              db.values(tb_name).always(function () { // make sure all run.
                db.close();
                ydn.db.deleteDatabase(db.getName(), type);
                start();
              });

            });
          });

        });
      });
    });

  });

})();


(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('RecordEvent Event test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("RecordEvent Event", test_env);

  asyncTest("created", function () {
    expect(6);

    var db = new ydn.db.Storage(db_name_event, events_schema);

    var key = Math.ceil(Math.random() * 100000);
    var data = { test: "random value", name: "name " + key, id: key };

    db.addEventListener('created', function (e) {
      //console.log(e);
      equal(e.type, 'created', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
    });

    db.addEventListener('updated', function (e) {
      //console.log(e);
      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      deepEqual(e.getValue(), data, 'value');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();
    });

    db.add(store_inline, data);
    db.put(store_inline, data);

  });


  asyncTest("updated", function () {
    expect(10);

    var db = new ydn.db.Storage(db_name_event, events_schema);

    var key = Math.ceil(Math.random() * 100000);
    var data = { test: "random value", name: "name " + key, id: key };

    var firedCreatedEvent = false;
    db.addEventListener(['created'], function (e) {
      //console.log(e);

      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
      firedCreatedEvent = true;

    });

    db.addEventListener(['updated'], function (e) {
      //console.log(e);

      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'updated', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();

    });

    db.add(store_inline, data);
    db.put(store_inline, data);

  });

})();


(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('Store Event test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Store Event", test_env);

  asyncTest("created", function () {
    expect(5);

    var db = new ydn.db.Storage(db_name_event, events_schema);

    var keys = [Math.ceil(Math.random() * 100000),
      Math.ceil(Math.random() * 100000)];
    var data = [
      {name: "rand key 1", id: keys[0]},
      {name: "rand key 2", id: keys[1]}
    ];

    db.addEventListener('created', function (e) {
      // console.log(e);
      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      deepEqual(e.getKeys(), keys, 'keys');
      deepEqual(e.getValues(), data, 'values');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();
    });

    db.add(store_inline, data);

  });


  asyncTest("updated", function () {
    expect(10);

    var db = new ydn.db.Storage(db_name_event, events_schema);
    var keys = [Math.ceil(Math.random() * 100000),
      Math.ceil(Math.random() * 100000)];
    var data = [
      {name: "rand key 1", id: keys[0]},
      {name: "rand key 2", id: keys[1]}
    ];

    var firedCreatedEvent = false;
    db.addEventListener(['created'], function (e) {
      //console.log(e);

      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      deepEqual(e.getKeys(), keys, 'created key');
      deepEqual(e.getValues(), data, 'created value');

    });

    db.addEventListener(['updated'], function (e) {
      //console.log(e);

      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'updated', 'type');
      deepEqual(e.getKeys(), keys, 'updated key');
      deepEqual(e.getValues(), data, 'updated value');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();

    });

    db.add(store_inline, data);
    db.put(store_inline, data);

  });

})();


(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('RecordEvent Event test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Run in transaction", test_env);

  asyncTest("all four crud operations in one transaction", function () {
    expect(4);

    var db_name = 'test_run_1';

    var db = new ydn.db.Storage(db_name, events_schema);

    db.run(function(tdb) {
      var key1 = Math.ceil(Math.random() * 100000);
      var obj = {test: 'first value', id: key1};

      tdb.add(store_inline, obj).always(function(x) {
        equal(key1, x, 'add key');
      });
      var key = Math.ceil(Math.random() * 100000);
      var data = { test: "random value", name: "name " + key, id: key };
      tdb.put(store_inline, data).always(function(x) {
        equal(key, x, 'put key');
      });
      tdb.values(store_inline, [key1, key]).always(function(x) {
        deepEqual([obj, data], x, 'get objects');
      });
      tdb.clear(store_inline).always(function(x) {
        equal(1, x, 'clear');
      });
    }, null, 'readwrite', function() {
      start();
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    })

  });

})();



(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('RecordEvent Event test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Abort", test_env);

  asyncTest("abort a put operation request method", 7, function () {

    var db_name = 'test_abort_1';
    var st1 = 's' + Math.random();
    var st2 = 's' + Math.random();
    var st3 = 's' + Math.random();

    var schema = {
      stores: [
        {
          name: st1,
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: st2,
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: st3,
          keyPath: 'id',
          type: 'NUMERIC'
        }]
    };
    var obj = {
      id: Math.random(),
      value: 'msg' + Math.random()
    };

    var db = new ydn.db.Storage(db_name, schema);
    var adb = db.branch('atomic-serial');

    var done_count = 0;
    var done = function() {
      done_count++;
      if (done_count >= 3) {
        start();
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      }
    };

    db.put(st1, obj).always(function (key) {
      equal(obj.id, key, 'aborted store key');
      db.abort();
    });
    db.get(st1, obj.id).always(function (result) {
      equal(undefined, result, 'aborted store result');
      done();
    });

    db.put(st2, obj).always(function (key) {
      equal(obj.id, key, 'store 2 key');
    });
    db.get(st2, obj.id).always(function (result) {
      equal(obj.value, result.value, 'store 2 result');
      done();
    });

    adb.put(st3, obj).always(function (key) {
      equal(obj.id, key, 'atomic store key');
      throws (function () { // this is an assertion too
        db.abort();
      }, undefined, 'atomic tx cannot be aborted');
    });

    adb.get(st3, obj.id).always(function (result) {
      equal(obj.value, result.value, 'atomic store result');
      done();
    });

  });


  asyncTest("abort in run", 4, function () {

    var db_name = 'test_abort_2';

    var schema = {
      stores: [
        {
          name: 's1',
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: 's2',
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: 's3',
          keyPath: 'id',
          type: 'NUMERIC'
        }]
    };
    var obj = {
      id: Math.random(),
      value: 'msg' + Math.random()
    };
    var obj2 = {
      id: Math.random(),
      value: 'msg' + Math.random()
    };

    var db = new ydn.db.Storage(db_name, schema);
    var adb = db.branch('atomic-serial');

    var done_count = 0;
    var done = function() {
      done_count++;
      if (done_count >= 2) {
        start();
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      }
    };

    db.run(function (tdb) {
      tdb.put('s1', obj).always(function (key) {
        tdb.get('s1', obj.id).then(function (result) {
          equal(obj.value, result.value, 'store 1 result');
          tdb.abort();
        }, function (e) {
          ok(false, 'store 1 get not error');
        });
      });

    }, ['s1'], 'readwrite', function (t, e) {
      db.get('s1', obj.id).always(function (result) {
        equal(undefined, result, 'aborted store 1 done result');
        done();
      });
    });

    db.run(function (tdb) {
      tdb.put('s2', obj).always(function (key) {
        tdb.get('s2', obj.id).always(function (result) {
          equal(obj.value, result.value, 'store 2 result');
        });
      });

    }, ['s2'], 'readwrite', function (t, e) {
      db.get('s2', obj.id).always(function (result) {
        equal(obj.value, result.value, 'store 2 done result');
        done();
      });
    });


  });

})();



(function () {
  var test_env = {
    setup: function () {
      test_env.ydnTimeoutId = setTimeout(function () {
        start();
        console.warn('Error test not finished.');
      }, 1000);
    },
    teardown: function () {
      clearTimeout(test_env.ydnTimeoutId);
    }
  };

  module("Error", test_env);

  var db_name = 'test_constrained_error' + Math.random();
  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: 'id',
        type: 'NUMERIC'
      }]
  };
  var db = new ydn.db.Storage(db_name, schema, options);
  var obj = {id: 1, value: 'v' + Math.random()};

  asyncTest("ConstraintError on adding existing key", 2, function () {
    db.add('st', obj).always(function (k) {
      equal(k, 1, 'key 1 added')
    });
    db.add('st', obj).then(function (x) {
      ok(false, 'should not add again with existing key');
      start();
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    }, function (e) {
      if (db.getType() == 'websql') {
        console.log(e);
        equal(e.code, 6, 'got ConstraintError');
        // this test fail on Safari OS X lion, getting code value of 1 instead
        // of 6. I believe this is Safari bug.
      } else {
        equal(e.name, 'ConstraintError', 'got ConstraintError');
      }
      start();
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    });
  });

})();



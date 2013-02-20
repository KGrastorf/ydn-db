
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db');

goog.require('ydn.db.Storage');



var reachedFinalContinuation, schema, debug_console, objs;
var store_name = 't1';
var db_name = 'test_index_2';

var setUp = function() {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  //ydn.db.core.req.WebSql.DEBUG = true;
  //ydn.db.index.req.WebSql.DEBUG = true;

  reachedFinalContinuation = false;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



var load_default = function() {

  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var typeIndex = new ydn.db.schema.Index('type', ydn.db.schema.DataType.TEXT, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.INTEGER, [indexSchema, typeIndex]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);

  objs = [
    {id: -3, value: 'ba', type: 'a', remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
    {id: 1, value: 'b', type: 'b', remark: 'test ' + Math.random()},
    {id: 3, value: 'b1', type: 'b', remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: 'c', remark: 'test ' + Math.random()},
    {id: 11, value: 'a3', type: 'c', remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  return db;
};


var load_default2 = function() {
  var db_name = 'index-test-2';
  var indexSchema = new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT, false, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.TEXT, [indexSchema]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  var db = new ydn.db.Storage(db_name, schema, options);


  objs = [
    {id:'qs0', value: 0, tag: ['a', 'b']},
    {id:'qs1', value: 1, tag: 'a'},
    {id:'at2', value: 2, tag: ['a', 'b']},
    {id:'bs1', value: 3, tag: 'b'},
    {id:'bs2', value: 4, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, tag: ['c']},
    {id:'st3', value: 6}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  return db;
};


var test_11_list_store = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name);

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_12_list_store_reverse = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs.reverse(), result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name, undefined, null, true);

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_13_list_store_range = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', 3, result.length);
      assertEquals('0', objs[2].id, result[0].id);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name, undefined, ydn.db.KeyRange.bound(1, 10));

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_15_list_limit = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', 3, result.length);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name);

  db.values(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_21_list_index = function () {
  var db = load_default();
  var done, result;
  goog.array.sort(objs, function(a, b) {
    return goog.array.defaultCompare(a.value, b.value);
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.IndexValueCursors(store_name, 'value');

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    //console.log(db.explain(q));
    result = value;
    done = true;
  });
};


var test_22_list_index_rev = function () {
  var db = load_default();
  var done, result;
  goog.array.sort(objs, function(a, b) {
    return - goog.array.defaultCompare(a.value, b.value);
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.IndexValueCursors(store_name, 'value', null, true);

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    //console.log(db.explain(q));
    result = value;
    done = true;
  });
};

var test_23_list_index_range = function () {
  var db = load_default();
  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', 3, result.length);
      assertEquals('0', objs[1].id, result[0].id);
      assertEquals('3', objs[2].id, result[2].id);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.bound('a', 'b');
  var q = new ydn.db.IndexValueCursors(store_name, 'value', range);

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    //console.log(db.explain(q));
    result = value;
    done = true;
  });
};



var test_count_by_iterator = function () {

  var db = load_default();

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('result', 3, result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  //var range = ydn.db.KeyRange.bound(1, 10);
  //var iter = new ydn.db.KeyCursors(store_name, range);
  var iter = ydn.db.KeyCursors.where(store_name, '>=', 1, '<=', 10);
  db.count(iter).addBoth(function(x) {
    result = x;
    done = true;
  }, function(e) {
    throw e;
  })

};

var test_count_by_index_iterator = function () {

  var db = load_default();

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('result', 2, result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.only('a');
  var iter = new ydn.db.Cursors(store_name, 'type', range);
  db.count(iter).addBoth(function(x) {
    result = x;
    done = true;
  }, function(e) {
    throw e;
  })

};


var test_list_by_index = function () {

  var db = load_default();

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', objs.slice(0, 2), result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.only('a');
  db.values(store_name, range, undefined, undefined, 'type').addBoth(function(x) {
    result = x;
    done = true;
  }, function(e) {
    throw e;
  })

};

var test_keys_by_index = function () {

  var db = load_default();

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', objs.slice(0, 2).map(function(x) {return x.id}), result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.only('a');
  db.keys(store_name, range, 100, 0, 'type').addBoth(function(x) {
    result = x;
    done = true;
  }, function(e) {
    throw e;
  })

};


var test_42_clear_by_index_key_range = function() {
  var db = load_default();
  var hasEventFired = false;
  var countValue;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('2 b', 2, countValue);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.bound('b', 'c', false, true);
  db.clear(store_name, 'type', range).addBoth(function(value) {
    countValue = value;
    hasEventFired = true;
  });

};


var test_multiEntry = function () {

  var db = load_default2();

  var tags = ['d', 'b', 'c', 'a', 'e'];
  var exp_counts = [1, 3, 2, 4, 0];
  var counts = [];
  var total = tags.length;
  var done = 0;

  waitForCondition(
      // Condition
      function () {
        return done == total;
      },
      // Continuation
      function () {

        for (var i = 0; i < total; i++) {
          assertEquals('for tag: ' + tags[i] + ' count', exp_counts[i], counts[i]);
        }

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  var count_for = function (tag_name, idx) {
    var keyRange = ydn.db.KeyRange.only(tag_name);
    var q = new ydn.db.Iterator(store_name, 'tag', keyRange);

    db.values(q).addBoth(function (value) {
      //console.log(tag_name + ' ==> ' + JSON.stringify(value));
      counts[idx] = value.length;
      done++;
    });
  };

  for (var i = 0; i < total; i++) {
    count_for(tags[i], i);
  }

};



var test_compound_index = function () {

  var objs = [
    {
      id: 1,
      label1: 'a',
      label2: 'a'
    }, {
      id: 2,
      label1: 'a',
      label2: 'b'
    }, {
      id: 3,
      label1: 'b',
      label2: 'a'
    }, {
      id: 4,
      label1: 'b',
      label2: 'b'
    }
  ];

  var schema = {
    stores: [{
      name: 'st1',
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [
        {
          name: '12',
          keyPath: ['label1', 'label2']
        }
      ]
    }]
  };

  var db_name = 'test_' + Math.random();

  var db = new ydn.db.Storage(db_name, schema, options);

  var done, result;

  db.put('st1', objs).addCallbacks(function(keys) {
    db.values('st1', ydn.db.KeyRange.bound(['a'], ['b']), 100, 0, '12').addCallbacks(function(x) {
      result = x;
      console.log(x);
      done = true;
    }, function(e) {
      throw e;
    })
  }, function(e) {
    throw e;
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', 2, result.length);
      assertArrayEquals(objs.slice(0, 2), result);
      ydn.db.deleteDatabase(db_name);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);




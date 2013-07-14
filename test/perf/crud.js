/**
 * @fileoverview Performance test.
 */

// ydn.debug.log('ydn.db', 'finest');

var db_name = 'pref-test-1';
var schema = {
  stores: [
    {
      name: 'st',
      autoIncrement: true
    }, {
      name: 'big',
      autoIncrement: true,
      indexes: [
        {
          name: 'n',
          unique: true,
          type: 'NUMERIC'
        }, {
          name: 't',
          type: 'TEXT'
        }, {
          name: 'm',
          multiEntry: true
        }]
    }]
};
var db = new ydn.db.Storage(db_name, schema);


var testPutSmall = function(db, data, onComplete, n) {
  // small data put test
  var small_data = {foo: 'bar'};
  for (var i = 0; i < n; i++) {
    var req = db.put('st', small_data);
    if (i == n - 1) {
      req.always(function() {
        onComplete(); // timer end
      });
    }
  }
};


var testPutOnRunSmall = function(th_db, data, onComplete, n) {
  // NOTE: thread policy don't metter in this test.
  var small_data = {foo: 'bar'};
  var req = db.run(function(tdb) { // make sure req is committed.
    for (var i = 0; i < n; i++) {
      tdb.put('st', small_data);
    }
  }, null, 'readwrite');
  req.always(function() {
    onComplete();
  });
};


var initClear = function(cb) {
  db.clear().always(function() {
    cb();
  });
};


var initPutArraySmall = function(cb, n) {
  // small data put test
  var data = [];
  for (var i = 0; i < n; i++) {
    data[i] = {foo: 'bar'};
  }
  db.clear().always(function() {
    cb(data);
  });
};


var testPutArraySmall = function(db, data, onComplete, n) {
  var req = db.put('st', data);
  req.always(function() {
    // make sure it complete write
    db.get('st', 1).always(function() {
      onComplete();
    });
  });
};

var initGetSmall = function(onComplete, n) {
  var data = [];
  for (var i = 0; i < n; i++) {
    data[i] = {foo: 'bar'};
  }
  db.clear('st').always(function() {
    var req = db.put('st', data);
    req.always(function() {
      // make sure it complete write
      db.keys('st', null, 1).always(function(x) {
        // smallest key
        onComplete(x[0]);
      });
    });
  });
};

var testGetSmall = function(db, data, onComplete, n) {
  // small data put test
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var id = (n * Math.random()) | 0;
    var req = db.get('st', id);
    req.always(function(x) {
      cnt++;
      if (cnt == n) {
        onComplete(); // timer end
      }
    });
  };

};


var testValuesKeyRangeSmall = function(db, start, onComplete, n) {
  var range = ydn.db.KeyRange.bound(start, start + n, false, true);
  db.values('st', range, 100000).always(function(x) {
    onComplete();
    if (x.length != n) {
      throw new Error('result must have ' + n + ' objects, but found ' +
          x.length, x);
    }
  });
};


var testKeysKeyRangeSmall = function(db, start, onComplete, n) {
  var range = ydn.db.KeyRange.bound(start, start + n, false, true);
  db.keys('st', range, 10000).always(function(x) {
    onComplete();
    if (x.length != n) {
      throw new Error('keys result must have ' + n + ' objects, but found ' +
          x.length, x);
    }
  });
};

var initBigData = function(cb, n) {
  var long =  (new Array(1000)).join(
      (new Array(10)).join('abcdefghijklmnopuqstubc'));
  var arr = [];
  for (var i = 0; i < 16; i++) {
    arr[i] = Math.random();
  }
  var data = [];
  for (var i = 0; i < n; i++) {
    data[i] = {
      load: long,
      n: Math.random(),
      m: arr,
      t: Math.random().toString(36).slice(2)
    };
  }
  console.log(n + ' big data generated');
  cb(data);
};


var testPutBig = function(db, data, onComplete, n) {
  // small data put test
  var small_data = {foo: 'bar'};
  for (var i = 0; i < n; i++) {
    var req = db.put('big', small_data);
    if (i == n - 1) {
      req.always(function() {
        onComplete(); // timer end
      });
    }
  }
};

var init100IndexData = function(cb) {
  initBigData(function(data) {
    db.clear('big').always(function() {
      var req = db.put('big', data);
      req.always(function() {
        cb(data); // timer end
      });
    });
  }, 100);
};


var valuesIndexKeyRangeBig = function(db, start, onComplete, n) {
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var range = ydn.db.KeyRange.lowerBound(Math.random());
    db.values('big', 'n', range, 1).always(function(x) {
      cnt++;
      if (cnt == n) {
        onComplete(); // timer end
      } else {
        // console.log(x); // ok
      }
    });
  }
};



var keysIndexKeyRangeBig = function(db, start, onComplete, n) {
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var range = ydn.db.KeyRange.lowerBound(Math.random());
    db.keys('big', 'n', range, 1).always(function(x) {
      cnt++;
      if (cnt == n) {
        onComplete(); // timer end
      } else {
        // console.log(x); // ok
      }
    });
  }
};

var valuesIndexKeyRangeBigLimit5 = function(db, start, onComplete, n) {
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var range = ydn.db.KeyRange.lowerBound(Math.random());
    db.values('big', 'n', range, 10).always(function(x) {
      cnt++;
      if (cnt == n) {
        onComplete(); // timer end
      } else {
        // console.log(x); // ok
      }
    });
  }
};


var keysIndexKeyRangeBigLimit5 = function(db, start, onComplete, n) {
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var range = ydn.db.KeyRange.lowerBound(Math.random());
    db.keys('big', 'n', range, 10).always(function(x) {
      cnt++;
      if (cnt == n) {
        onComplete(); // timer end
      } else {
        // console.log(x); // ok
      }
    });
  }
};

var valuesIndexIterBig = function(db, start, onComplete, n) {
  for (var i = 0; i < n; i++) {
    var iter = ydn.db.IndexValueCursors.where('big', 'n', '>', Math.random());
    db.values(iter, 1).always(function(x) {
      if (i == n - 1) {
        onComplete(); // timer end
      } else {

      }
    });
  };
};


var pref = new Pref(db);

 pref.addTest('Put (small-object)', testPutSmall, initClear, 100, 10);
 pref.addTest('Put array (small-object)', testPutArraySmall, initPutArraySmall, 100, 10);
 pref.addTest('Put on a transaction (small-object)', testPutOnRunSmall, initClear, 100, 10);
 pref.addTest('Get (small-object)', testGetSmall, initGetSmall, 100, 10);
 pref.addTest('Values by key range (small-object)', testValuesKeyRangeSmall, null, 100, 10);
 pref.addTest('Keys by key range (small-object)', testKeysKeyRangeSmall, null, 100, 10);

 pref.addTest('Put (with indexes)', testPutBig, initBigData, 20, 5);

pref.addTest('Keys index key range limit 1', keysIndexKeyRangeBig, init100IndexData, 20, 10);
 pref.addTest('Values index key range limit 1', valuesIndexKeyRangeBig, null, 20, 10);
 pref.addTest('Values index key range limit 10', valuesIndexKeyRangeBigLimit5, null, 20, 10);
 pref.addTest('Keys index key range limit 10', keysIndexKeyRangeBigLimit5, null, 20, 10);
pref.run();

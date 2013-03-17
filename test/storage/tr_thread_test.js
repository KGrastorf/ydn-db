// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');
goog.require('ydn.db');
goog.require('ydn.db.core.Storage');


var reachedFinalContinuation;
var table_name = 't1';
var stubs;
var basic_schema = {
  stores: [
    {
      name: table_name,
      keyPath: 'id',
      type: 'TEXT'
    }]
};

var setUp = function() {
  ydn.debug.log('ydn.db', 'finest');
  ydn.db.con.IndexedDb.DEBUG = true;

};


var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



var nested_request_test = function(thread, exp_tx_no) {

  var db_name = 'nested_request_test' + Math.random();
  options.thread = thread;
  var db = new ydn.db.core.Storage(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;
  var tx_no = [];

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        assertEquals('correct obj', val.value, result.value);
        assertArrayEquals('tx no', exp_tx_no, tx_no);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, val).addBoth(function() {
    tx_no.push(db.getTxNo());
  });
  db.get(table_name, 'a').addBoth(function (r) {
    tx_no.push(db.getTxNo());
    // do some heavy DOM
    for (var i = 0; i < 1000; i++) {
      var div = document.createElement('div');
      r.textContent = r.id + ' ' + r.value;
      document.body.appendChild(div);
    }

    db.get(table_name, 'a').addBoth(function (x) {
      result = x;
      tx_no.push(db.getTxNo());
      t1_fired = true;
    });
  });

};


var test_serial_atomic = function() {
  nested_request_test('atomic-serial', [1, 2, 3]);
};

var test_serial_strict_overflow = function() {
  nested_request_test('strict-overflow-serial', [1, 2, 2]);
};

var test_parallel_strict_overflow = function() {
  nested_request_test('strict-overflow-parallel', [1, 2, 2]);
};






var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);




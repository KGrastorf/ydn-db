/**
 * @fileoverview Exports for tr-ydn-db module.
 */

goog.require('ydn.db.tr.Storage');
goog.require('ydn.db.tr.DbOperator');


goog.exportProperty(ydn.db.tr.Storage.prototype, 'thread',
  ydn.db.tr.Storage.prototype.thread);
goog.exportProperty(ydn.db.tr.Storage.prototype, 'run',
    ydn.db.tr.Storage.prototype.run);
goog.exportProperty(ydn.db.tr.DbOperator.prototype, 'abort',
  ydn.db.tr.DbOperator.prototype.abort);


goog.exportProperty(ydn.db.TxError.prototype, 'getResult',
  ydn.db.TxError.prototype.getResult);


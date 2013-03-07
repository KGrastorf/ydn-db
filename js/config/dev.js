/**
 * @fileoverview Exports for dev-ydn-db module.
 *
 */


goog.require('ydn.debug');
goog.require('ydn.db.con.Storage');


goog.exportSymbol('ydn.debug.log', ydn.debug.log);

goog.exportProperty(ydn.db.con.Storage.prototype, 'db',
  ydn.db.con.Storage.prototype.getDbInstance);

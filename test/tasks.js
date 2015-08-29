var jst = require('json-schema-table');
var glob = require('glob');
var unorm = require('unorm');
var path = require('path');

var tables = [];

glob.sync(__dirname + '/schemas/*.json').map(function(file) {
  tables.push({
    name: unorm.nfc(path.basename(file, '.json')),
    schema: require(file)
  });
});

exports.createTables = function(db) {
  tables.map(function(table) {
    table.jst = jst(table.name, table.schema, {db: db});
  });
  return tables.reduce(function(promise, table) {
    return promise.then(function() {
      return table.jst.create();
    });
  }, Promise.resolve()).then(function() {
    return tables.reduce(function(promise, table) {
      return promise.then(function() {
        return table.jst.sync();
      });
    }, Promise.resolve());
  });
};


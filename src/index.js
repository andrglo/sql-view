// Adapted from https://github.com/cnect/sails-sqlserver/blob/master/lib/sql.js

var _ = require('lodash');
var debug = require('debug')('sql-view');
var assert = require('assert');
var sql = require('./sql');

module.exports = function(dialect) {

  return {
    build: function(view, criteria) {
      criteria = criteria || {};
      sql.dialect = dialect;
      var statement = build(view, criteria);
      debug(dialect, statement);
      return statement;
    }
  };

};

function build(view, criteria) {

  var columns = [];
  var groupBy = [];
  var orderBy = [];
  var where = criteria.where ? sql.where(criteria.where) : void 0;

  _.forEach(sql.toArray(criteria.select), function(column) {
    var info = splitAlias(column);
    columns.push(info.column + ' AS ' + info.as);
  });

  _.forEach(sql.toArray(criteria.groupBy), function(column) {
    var info = splitAlias(column);
    columns.push(info.column + ' AS ' + info.as);
    groupBy.push(info.column);
  });

  _.forEach(sql.toArray(criteria.sum), function(column) {
    var info = splitAlias(column);
    columns.push('SUM(' + info.column + ') AS ' + info.as);
  });

  _.forEach(sql.toArray(criteria.avg), function(column) {
    var info = splitAlias(column);
    columns.push('AVG(' + info.column + ') AS ' + info.as);
  });

  _.forEach(sql.toArray(criteria.max), function(column) {
    var info = splitAlias(column);
    columns.push('MAX(' + info.column + ') AS ' + info.as);
  });

  _.forEach(sql.toArray(criteria.min), function(column) {
    var info = splitAlias(column);
    columns.push('MIN(' + info.column + ') AS ' + info.as);
  });

  _.forEach(sql.toArray(criteria.order), function(column) {
    var direction;
    if (column.substr(column.length - 4).toUpperCase() === ' ASC') {
      direction = 'ASC';
      column = column.substr(0, column.length - 4);
    } else if (column.substr(column.length - 5).toUpperCase() === ' DESC') {
      direction = 'DESC';
      column = column.substr(0, column.length - 5);
    }
    orderBy.push(sql.wrap(column) + (direction ? ' ' + direction : ''));
  });

  var statement = 'SELECT ' +
    (columns.length ? columns.join() : '*') +
    ' FROM (' + view + ') t' +
    (where ? ' WHERE ' + where : '') +
    (groupBy.length ? ' GROUP BY ' + groupBy.join() : '');

  if (sql.dialect === 'postgres') {
    if (orderBy.length) {
      statement += ' ORDER BY ' + orderBy.join();
    }
    if (criteria.limit) {
      statement += ' LIMIT ' + criteria.limit;
    }
    if (criteria.skip) {
      assert(criteria.order, 'Order should be defined when using skip');
      statement += ' OFFSET ' + criteria.skip;
    }
  } else { // msssql
    if (criteria.skip) {
      assert(criteria.order, 'Order should be defined when using skip');
      statement = 'SELECT' +
        (criteria.limit ? ' TOP ' + criteria.limit : '') +
        ' * FROM (SELECT ROW_NUMBER() OVER (ORDER BY ' + orderBy.join() +
        ') AS row_number,* FROM (' + statement + ') t) t ' +
        'WHERE row_number > ' + criteria.skip;
    } else {
      if (orderBy.length) {
        statement += ' ORDER BY ' + orderBy.join();
      }
      if (criteria.limit) {
        statement = statement.replace('SELECT ', 'SELECT TOP ' + criteria.limit + ' ');
      }
    }
  }
  return statement;
}

function splitAlias(name) {
  var res = {};
  var re = /^(.+) as (.+)$/i;
  var match = re.exec(name);
  if (match) {
    res.column = sql.wrap(match[1]);
    res.as = sql.wrap(match[2]);
  } else {
    res.column = sql.wrap(name);
    res.as = res.column;
  }
  return res;
}

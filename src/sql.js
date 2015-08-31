// Adapted from https://github.com/cnect/sails-sqlserver/blob/master/lib/sql.js

var _ = require('lodash');

var sql = {

  toArray: function toArray(element) {
    return element ?
      _.isArray(element) ? element : [element] :
      void 0;
  },

  wrap: function(identifier) {
    if (sql.dialect === 'mssql') {
      return '[' + identifier + ']';
    } else {
      return '"' + identifier + '"';
    }
  },

  values: function(values, key) {
    return sql.build(values, sql.prepareValue, ', ', key);
  },

  prepareCriterion: function(value, key, parentKey) {
    if (_.isObject(value) && !_.isDate(value) && !_.isArray(value)) {
      return sql.where(value, null, key);
    }
    var attrStr;
    if (parentKey) {
      attrStr = sql.wrap(parentKey);
      if (key === 'lt') {
        return attrStr + '<' + sql.prepareValue(value);
      } else if (key === 'lte') {
        return attrStr + '<=' + sql.prepareValue(value);
      } else if (key === 'gt') {
        return attrStr + '>' + sql.prepareValue(value);
      } else if (key === 'gte') {
        return attrStr + '>=' + sql.prepareValue(value);
      } else if (key === 'not') {
        if (value === null) {
          return attrStr + ' IS NOT NULL';
        } else if (_.isArray(value)) {
          return attrStr + ' NOT IN (' + sql.values(value, key) + ')';
        } else {
          return attrStr + '<>' + sql.prepareValue(value);
        }
      } else if (key === 'like' || key === 'contains' || key === 'startsWith' || key === 'endsWith') {
        if (key === 'contains') {
          value = '%' + value + '%';
        } else if (key === 'startsWith') {
          value += '%';
        } else if (key === 'endsWith') {
          value = '%' + value;
        }
        return attrStr + ' LIKE ' + sql.prepareValue(value);
      } else {
        throw new Error('Unknown comparator: ' + key);
      }
    } else {
      attrStr = sql.wrap(key);
      if (_.isNull(value)) {
        return attrStr + ' IS NULL';
      } else {
        return attrStr + '=' + sql.prepareValue(value, key);
      }
    }
  },

  prepareValue: function(value) {
    sql.params.push(value);
    return '$' + sql.params.length;
  },

  where: function(where, key, parentKey) {
    return sql.build(where, sql.predicate, ' AND ', undefined, parentKey);
  },

  predicate: function(criterion, key, parentKey) {
    var partial = '';
    if (parentKey) {
      return sql.prepareCriterion(criterion, key, parentKey);
    }
    if (key.toLowerCase() === 'or') {
      partial = sql.build(criterion, sql.where, ' OR ');
      return ' ( ' + partial + ' ) ';
    } else if (key.toLowerCase() === 'and') {
      partial = sql.build(criterion, sql.where, ' AND ');
      return ' ( ' + partial + ' ) ';
    } else if (_.isArray(criterion)) {
      var values = sql.values(criterion, key) || 'NULL';
      partial = sql.wrap(key) + ' IN (' + values + ')';
      return partial;
    } else {
      return sql.prepareCriterion(criterion, key);
    }
  },

  build: function(collection, fn, separator, keyOverride, parentKey) {
    separator = separator || ', ';
    var where = '';
    _.each(collection, function(value, key) {
      where += fn(value, keyOverride || key, parentKey);
      where += separator;
    });
    return _.str.rtrim(where, separator);
  }

};

module.exports = sql;

// Adapted from https://github.com/cnect/sails-sqlserver/blob/master/lib/sql.js

var _ = require('lodash');
_.str = require('underscore.string');

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

  escape: function(val, stringifyObjects, timeZone) {

    if (val === undefined || val === null) {
      return 'NULL';
    }

    switch (typeof val) {
      case 'boolean':
        return (val) ? '1' : '0';
      case 'number':
        return val + '';
    }

    if (typeof val === 'object') {
      val = val.toString();
    }

    val = val.replace(/[\']/g, function(s) {
      switch (s) {
        case '\'':
          return '\'\'';
        default:
          return ' ';
      }
    });

    return '\'' + val + '\'';
  },

  // Create a value csv for a DQL query
  // key => optional, overrides the keys in the dictionary
  values: function(collectionName, values, key) {
    return sql.build(collectionName, values, sql.prepareValue, ', ', key);
  },

  prepareCriterion: function(collectionName, value, key, parentKey) {

    if (validSubAttrCriteria(value)) {
      return sql.where(collectionName, value, null, key);
    }

    // Build escaped attr and value strings using either the key,
    // or if one exists, the parent key
    var attrStr;
    var valueStr;

    // Special comparator case
    if (parentKey) {

      attrStr = sql.wrap(parentKey);
      valueStr = sql.prepareValue(collectionName, value, parentKey);

      // Why don't we strip you out of those bothersome apostrophes?
      var nakedButClean = _.str.trim(valueStr, '\'');

      if (key === '<' || key === 'lessThan') return attrStr + '<' + valueStr;
      else if (key === '<=' || key === 'lessThanOrEqual') return attrStr + '<=' + valueStr;
      else if (key === '>' || key === 'greaterThan') return attrStr + '>' + valueStr;
      else if (key === '>=' || key === 'greaterThanOrEqual') return attrStr + '>=' + valueStr;
      else if (key === '!' || key === 'not') {
        if (value === null) return attrStr + ' IS NOT NULL';
        else if (_.isArray(value)) {
          //return attrStr + ' NOT IN (' + valueStr.split(',') + ')';
          return attrStr + ' NOT IN (' + sql.values(collectionName, value, key) + ')';
        }
        else return attrStr + '<>' + valueStr;
      }
      else if (key === 'like') return attrStr + ' LIKE \'' + nakedButClean + '\'';
      else if (key === 'contains') return attrStr + ' LIKE \'%' + nakedButClean + '%\'';
      else if (key === 'startsWith') return attrStr + ' LIKE \'' + nakedButClean + '%\'';
      else if (key === 'endsWith') return attrStr + ' LIKE \'%' + nakedButClean + '\'';
      else throw new Error('Unknown comparator: ' + key);
    } else {
      attrStr = sql.wrap(key);
      valueStr = sql.prepareValue(collectionName, value, key);
      if (_.isNull(value)) {
        return attrStr + ' IS NULL';
      } else return attrStr + '=' + valueStr;
    }
  },

  prepareValue: function(collectionName, value, attrName) {
    // Cast dates to SQL
    if (_.isDate(value)) {
      if (sql.dialect === 'mssql') {
        value = toSqlDate(value);
      } else {
        value = value.toISOString();
      }
    }

    // Cast functions to strings
    if (_.isFunction(value)) {
      value = value.toString();
    }

    // Escape (also wraps in quotes)
    return sql.escape(value);
  },

  // Starting point for predicate evaluation
  // parentKey => if set, look for comparators and apply them to the parent key
  where: function(collectionName, where, key, parentKey) {
    return sql.build(collectionName, where, sql.predicate, ' AND ', undefined, parentKey);
  },

  // Recursively parse a predicate calculus and build a SQL query
  predicate: function(collectionName, criterion, key, parentKey) {

    var queryPart = '';

    if (parentKey) {
      return sql.prepareCriterion(collectionName, criterion, key, parentKey);
    }

    // OR
    if (key.toLowerCase() === 'or') {
      queryPart = sql.build(collectionName, criterion, sql.where, ' OR ');
      return ' ( ' + queryPart + ' ) ';
    } else if (key.toLowerCase() === 'and') { // AND
      queryPart = sql.build(collectionName, criterion, sql.where, ' AND ');
      return ' ( ' + queryPart + ' ) ';
    } else if (_.isArray(criterion)) { // IN
      var values = sql.values(collectionName, criterion, key) || 'NULL';
      queryPart = sql.wrap(key) + ' IN (' + values + ')';
      return queryPart;
    } else if (key.toLowerCase() === 'like') { // LIKE
      return sql.build(collectionName, criterion, function(collectionName, value, attrName) {
        var attrStr = sql.wrap(attrName);
        if (_.isRegExp(value)) {
          throw new Error('RegExp not supported');
        }
        var valueStr = sql.prepareValue(collectionName, value, attrName);
        // Handle escaped percent (%) signs [encoded as %%%]
        valueStr = valueStr.replace(/%%%/g, '\\%');

        return attrStr + ' LIKE ' + valueStr;
      }, ' AND ');
    } else if (key.toLowerCase() === 'not') { // NOT
      throw new Error('NOT not supported yet!');
    } else { // Basic criteria item
      return sql.prepareCriterion(collectionName, criterion, key);
    }

  },


  build: function(collectionName, collection, fn, separator, keyOverride, parentKey) {

    separator = separator || ', ';
    var $sql = '';

    _.each(collection, function(value, key) {
      $sql += fn(collectionName, value, keyOverride || key, parentKey);

      // (always append separator)
      $sql += separator;
    });

    return _.str.rtrim($sql, separator);
  }

};

function toSqlDate(date) {
  date = date.getUTCFullYear() + '-' +
    ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
    ('00' + date.getUTCDate()).slice(-2) + ' ' +
    ('00' + date.getUTCHours()).slice(-2) + ':' +
    ('00' + date.getUTCMinutes()).slice(-2) + ':' +
    ('00' + date.getUTCSeconds()).slice(-2) + '.' +
    ('00' + date.getUTCMilliseconds()).slice(-3);

  return date;
}

function validSubAttrCriteria(c) {
  return _.isObject(c) && (
    !_.isUndefined(c.not) || !_.isUndefined(c.greaterThan) || !_.isUndefined(c.lessThan) || !_.isUndefined(c.greaterThanOrEqual) || !_.isUndefined(c.lessThanOrEqual) || !_.isUndefined(c['<']) || !_.isUndefined(c['<=']) || !_.isUndefined(c['!']) || !_.isUndefined(c['>']) || !_.isUndefined(c['>=']) || !_.isUndefined(c.startsWith) || !_.isUndefined(c.endsWith) || !_.isUndefined(c.contains) || !_.isUndefined(c.like));
}

module.exports = sql;

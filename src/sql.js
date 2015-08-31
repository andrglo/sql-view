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

  // Create a value csv for a DQL query
  // key => optional, overrides the keys in the dictionary
  values: function(values, key) {
    return sql.build(values, sql.prepareValue, ', ', key);
  },

  prepareCriterion: function(value, key, parentKey) {

    if (validSubAttrCriteria(value)) {
      return sql.where(value, null, key);
    }

    // Build escaped attr and value strings using either the key,
    // or if one exists, the parent key
    var attrStr;
    var valueStr;

    // Special comparator case
    if (parentKey) {

      attrStr = sql.wrap(parentKey);
      valueStr = sql.prepareValue(value, parentKey);

      // Why don't we strip you out of those bothersome apostrophes?
      var nakedButClean = _.str.trim(valueStr, '\'');

      if (key === 'lt') return attrStr + '<' + valueStr;
      else if (key === 'lte') return attrStr + '<=' + valueStr;
      else if (key === 'gt') return attrStr + '>' + valueStr;
      else if (key === 'gte') return attrStr + '>=' + valueStr;
      else if (key === 'not') {
        if (value === null) return attrStr + ' IS NOT NULL';
        else if (_.isArray(value)) {
          //return attrStr + ' NOT IN (' + valueStr.split(',') + ')';
          return attrStr + ' NOT IN (' + sql.values(value, key) + ')';
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
      valueStr = sql.prepareValue(value, key);
      if (_.isNull(value)) {
        return attrStr + ' IS NULL';
      } else return attrStr + '=' + valueStr;
    }
  },

  prepareValue: function(value) {
    sql.params.push(value);
    return '$' + sql.params.length;
  },

  // Starting point for predicate evaluation
  // parentKey => if set, look for comparators and apply them to the parent key
  where: function(where, key, parentKey) {
    return sql.build(where, sql.predicate, ' AND ', undefined, parentKey);
  },

  // Recursively parse a predicate calculus and build a SQL query
  predicate: function(criterion, key, parentKey) {

    var queryPart = '';

    if (parentKey) {
      return sql.prepareCriterion(criterion, key, parentKey);
    }

    // OR
    if (key.toLowerCase() === 'or') {
      queryPart = sql.build(criterion, sql.where, ' OR ');
      return ' ( ' + queryPart + ' ) ';
    } else if (key.toLowerCase() === 'and') { // AND
      queryPart = sql.build(criterion, sql.where, ' AND ');
      return ' ( ' + queryPart + ' ) ';
    } else if (_.isArray(criterion)) { // IN
      var values = sql.values(criterion, key) || 'NULL';
      queryPart = sql.wrap(key) + ' IN (' + values + ')';
      return queryPart;
    } else if (key.toLowerCase() === 'like') { // LIKE
      return sql.build(criterion, function(value, attrName) {
        var attrStr = sql.wrap(attrName);
        if (_.isRegExp(value)) {
          throw new Error('RegExp not supported');
        }
        var valueStr = sql.prepareValue(value, attrName);
        // Handle escaped percent (%) signs [encoded as %%%]
        valueStr = valueStr.replace(/%%%/g, '\\%');

        return attrStr + ' LIKE ' + valueStr;
      }, ' AND ');
    } else if (key.toLowerCase() === 'not') { // NOT
      throw new Error('NOT not supported yet!');
    } else { // Basic criteria item
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

function validSubAttrCriteria(c) {
  return _.isObject(c)
    && (!_.isUndefined(c.not)
    || !_.isUndefined(c.gt)
    || !_.isUndefined(c.lt)
    || !_.isUndefined(c.gte)
    || !_.isUndefined(c.lte)
    || !_.isUndefined(c.startsWith)
    || !_.isUndefined(c.endsWith)
    || !_.isUndefined(c.contains)
    || !_.isUndefined(c.like));
}

module.exports = sql;

# sql-view [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
> Rewrite a select statement embedding a filter, order, group or pagination using an otions object.
 For MS Sql Server and postgres

## Install

```sh
$ npm install --save sql-view
```


## Usage

```js
var sqlView = require('sql-view')('postgres');
        
// build(view, criteria)        
var view = sqlView.build('SELECT * FROM products'), {
  where: {
    price: {
      lt: '1000'
    }
  });
console.log(view); 
// => { statement: 'SELECT * FROM (SELECT * FROM "products") t WHERE "price"<$1',
//      params: [ '1000' ]
//    }

view = sqlView.build('products'), {
  where: {
    price: {
      lt: '1000'
    }
  });
console.log(view); 
// => { statement: 'SELECT * FROM "products" WHERE "price"<$1',
//      params: [ '1000' ]
//    }

```

## Criteria

The criteria objects are formed using one of four types of object keys. These are the top level
keys used in a query object. It is loosely based on the criteria used in Waterline.

```javascript
sqlView.build('select * from table', { where: { name: 'foo' }, skip: 20, limit: 10, order: 'name DESC' });
```

Use the key as the column name and the value for a exact match

```javascript
sqlView.build('select * from table', { where: { name: 'briggs' }})
```
They can be used together to filter for multiple columns

```javascript
sqlView.build('select * from table', { where: { name: 'briggs', state: 'california' }})
```
Keys can also hold any of the supported criteria
modifiers to perform queries where a strict equality check wouldn't work.

```javascript
sqlView.build('select * from table', { where: {
  name : {
    contains : 'alt'
  }
}})
```
With an array each element is treated as _or_ as _in_ queries

```javascript
sqlView.build('select * from table', { where: {
  name : ['briggs', 'mike']
}});
```

_Not in_ queries work similar to _in_ queries

```javascript
sqlView.build('select * from table', { where: {
  name: { not : ['briggs', 'mike'] }
}});
```

Performing _or_ queries is done by using an array of objects

```javascript
sqlView.build('select * from table', { where: {
  or : [
    { name: 'briggs' },
    { occupation: 'unknown' }
  ]
}})
```

The following modifiers are available to use when building queries

* `'lt'`
* `'lte'`
* `'gt'`
* `'gte'`
* `'not'`
* `'like'`
* `'contains'`
* `'startsWith'`
* `'endsWith'`

```javascript
sqlView.build('select * from table', { where: { age: { lte: 30 }}})
```
### Pagination

Allow you refine the results that are returned from a query. The current options
available are:

* `limit`
* `skip`
* `order`
* `select`

Limits the number of results returned from a query

```javascript
sqlView.build('select * from table', { where: { name: 'foo' }, limit: 20 })
```

Returns all the results excluding the number of items to skip

```javascript
sqlView.build('select * from table', { where: { name: 'foo' }, skip: 10 });
```

`skip` and `limit` can be used together to build up a pagination system.

```javascript
sqlView.build('select * from table', { where: { name: 'foo' }, limit: 10, skip: 10 });
```

Results can be sorted by attribute name. Simply specify an attribute name for natural (ascending)
order, or specify an _asc_ or _desc_ flag for ascending or descending order respectively.

```javascript
// Sort by name in ascending order (default)
sqlView.build('select * from table', { where: { name: 'foo' }, order: 'name' });
// or
sqlView.build('select * from table', { where: { name: 'foo' }, order: 'name asc' });

// Sort by name in descending order and also in email
sqlView.build('select * from table', { where: { name: 'foo' }, order: ['name desc', 'email'] });

```

Apply a projection

```javascript
// Returns only the field name
sqlView.build('select * from table', { where: { age: { lt: 30 } }, select: ['name'] })
```

Grouping

```javascript
// Returns only the field name
sqlView.build('select * from table', { groupBy: 'state', sum: 'population' })
```

The group functions available are: _sum_, _avg_, _max_ and _min_

## Credits

Inspired by the query language of [Waterline](https://github.com/balderdashy/waterline)
implemented by [cnect](https://github.com/cnect/sails-sqlserver)

## License

MIT © [Andre Gloria]()


[npm-image]: https://badge.fury.io/js/sql-view.svg
[npm-url]: https://npmjs.org/package/sql-view
[travis-image]: https://travis-ci.org/andrglo/sql-view.svg?branch=master
[travis-url]: https://travis-ci.org/andrglo/sql-view
[daviddm-image]: https://david-dm.org/andrglo/sql-view.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/andrglo/sql-view
[coveralls-image]: https://coveralls.io/repos/andrglo/sql-view/badge.svg
[coveralls-url]: https://coveralls.io/r/andrglo/sql-view

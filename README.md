# sql-view [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
> Rewrite a select statement embedding a filter, sort, group or pagination using an otions object.
 For MS Sql Server and postgres

## Install

```sh
$ npm install --save sql-view
```


## Usage

```js
var sqlView = require('sql-view')('postgres');
    
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


```

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

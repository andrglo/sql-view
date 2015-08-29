var gutil = require('gulp-util');
var PgCrLayer = require('pg-cr-layer');
var MssqlCrLayer = require('mssql-cr-layer');

var tasks = require('./tasks');
var spec = require('./spec');

var pgConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  pool: {
    max: 10,
    idleTimeout: 30000
  }
};
var pg = new PgCrLayer(pgConfig);

var mssqlConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: 'master',
  host: process.env.MSSQL_HOST || 'localhost',
  port: process.env.MSSQL_PORT || 1433,
  pool: {
    max: 10,
    idleTimeout: 30000
  }
};
var mssql = new MssqlCrLayer(mssqlConfig);

var databaseName = 'tests-sql-view';

function createPostgresDb() {
  var dbName = process.env.POSTGRES_DATABASE || databaseName;
  return pg.execute(
    'DROP DATABASE IF EXISTS "' + dbName + '";')
    .then(function() {
      return pg.execute('CREATE DATABASE "' + dbName + '"');
    });
}

function createMssqlDb() {
  var dbName = process.env.MSSQL_DATABASE || databaseName;
  return mssql.execute(
    'IF EXISTS(select * from sys.databases where name=\'' +
    dbName + '\') DROP DATABASE [' + dbName + '];' +
    'CREATE DATABASE [' + dbName + '];'
  );
}

var pgOptions = {};
var mssqlOptions = {};

before(function(done) {
  return pg.connect()
    .then(function() {
      return createPostgresDb()
        .then(function() {
          gutil.log('Postgres db created');
          return pg.close();
        })
        .then(function() {
          gutil.log('Postgres db creation connection closed');
          pgConfig.database = process.env.POSTGRES_DATABASE || databaseName;
          gutil.log('Postgres will connect to', pgConfig.database);
          pgOptions.db = new PgCrLayer(pgConfig);
          return pgOptions.db.connect();
        })
        .then(function() {
          return tasks.createTables(pgOptions.db);
        });
    })
    .then(function() {
      if (!process.env.CI) {
        return mssql.connect()
          .then(function() {
            return createMssqlDb()
              .then(function() {
                gutil.log('Mssql db created');
                return mssql.close();
              })
              .then(function() {
                gutil.log('Mssql db creation connection closed');
                mssqlConfig.database = process.env.MSSQL_DATABASE || databaseName;
                gutil.log('Mssql will connect to', mssqlConfig.database);
                mssqlOptions.db = new MssqlCrLayer(mssqlConfig);
                return mssqlOptions.db.connect();
              })
              .then(function() {
                return tasks.createTables(mssqlOptions.db);
              });
          });
      }
    })
    .then(function() {
      done();
    })
    .catch(function(error) {
      done(error);
    });
});

describe('postgres', function() {
  var duration;
  before(function() {
    duration = process.hrtime();
  });
  spec(pgOptions);
  after(function() {
    duration = process.hrtime(duration);
    gutil.log('Postgres finished');
  });
});

describe('mssql', function() {
  if (process.env.CI) {
    return;
  }
  var duration;
  before(function() {
    duration = process.hrtime();
  });
  spec(mssqlOptions);
  after(function() {
    duration = process.hrtime(duration);
    gutil.log('Mssql finished ');
  });
});

after(function() {
  if (!process.env.CI) {
    mssqlOptions.db.close();
  }
  pgOptions.db.close();
});


const PgCrLayer = require('pg-cr-layer')
const MssqlCrLayer = require('mssql-cr-layer')
const jst = require('json-schema-table')
const personSchema = require('./schemas/person.json')

const spec = require('./spec')

const pgConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  pool: {
    max: 10,
    idleTimeout: 30000
  }
}
const pg = new PgCrLayer(pgConfig)

const mssqlConfig = {
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD,
  database: 'master',
  host: process.env.MSSQL_HOST || 'localhost',
  port: process.env.MSSQL_PORT || 1433,
  pool: {
    max: 10,
    idleTimeout: 30000
  }
}
const mssql = new MssqlCrLayer(mssqlConfig)

const databaseName = 'tests-sql-view'

function createPostgresDb() {
  const dbName = process.env.POSTGRES_DATABASE || databaseName
  return pg
      .execute('DROP DATABASE IF EXISTS "' + dbName + '";')
      .then(function() {
        return pg.execute('CREATE DATABASE "' + dbName + '"')
      })
}

function createMssqlDb() {
  const dbName = process.env.MSSQL_DATABASE || databaseName
  return mssql.execute(
      'IF EXISTS(select * from sys.databases where name=\'' +
      dbName +
      '\') DROP DATABASE [' +
      dbName +
      '];' +
      'CREATE DATABASE [' +
      dbName +
      '];'
  )
}

const pgOptions = {}
const mssqlOptions = {}

before(() =>
  pg
      .connect()
      .then(function() {
        return createPostgresDb()
            .then(function() {
              console.log('Postgres db created')
              return pg.close()
            })
            .then(function() {
              console.log('Postgres db creation connection closed')
              pgConfig.database = process.env.POSTGRES_DATABASE || databaseName
              console.log('Postgres will connect to', pgConfig.database)
              pgOptions.db = new PgCrLayer(pgConfig)
              return pgOptions.db.connect()
            })
            .then(function() {
              return jst('person', personSchema, {db: pgOptions.db}).create()
            })
      })
      .then(() =>
        mssql.connect().then(function() {
          return createMssqlDb()
              .then(function() {
                console.log('Mssql db created')
                return mssql.close()
              })
              .then(function() {
                console.log('Mssql db creation connection closed')
                mssqlConfig.database = process.env.MSSQL_DATABASE || databaseName
                console.log('Mssql will connect to', mssqlConfig.database)
                mssqlOptions.db = new MssqlCrLayer(mssqlConfig)
                return mssqlOptions.db.connect()
              })
              .then(function() {
                return jst('person', personSchema, {
                  db: mssqlOptions.db
                }).create()
              })
        })
      )
)

describe('postgres', function() {
  let duration
  before(function() {
    duration = process.hrtime()
  })
  spec(pgOptions)
  after(function() {
    duration = process.hrtime(duration)
    console.info(
        'postgres finished after: %ds %dms',
        duration[0],
        duration[1] / 1000000
    )
  })
})

describe('mssql', function() {
  let duration
  before(function() {
    duration = process.hrtime()
  })
  spec(mssqlOptions)
  after(function() {
    duration = process.hrtime(duration)
    console.info(
        'mssql finished after: %ds %dms',
        duration[0],
        duration[1] / 1000000
    )
  })
})

after(function() {
  if (mssqlOptions.db) {
    mssqlOptions.db.close()
  }
  if (pgOptions.db) {
    pgOptions.db.close()
  }
})

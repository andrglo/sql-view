'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.should();
var gutil = require('gulp-util');
var _ = require('lodash');

var sqlView = require('../src');

module.exports = function(options) {

  var db;
  var cadAtivo;
  var numberOfRecordsToGenerate = 100;
  before(function(done) {
    db = options.db;
    cadAtivo = require('./entities/cadastro.js')({db: db});
    gutil.log('Is generating ' + numberOfRecordsToGenerate + ' entities...');
    var promise = Promise.resolve();
    var i = 1;
    _.times(numberOfRecordsToGenerate, function() {
      var order = i++;
      promise = promise.then(function() {
        return cadAtivo
          .create({
            NOMECAD: _.padLeft(String(order), 3, '00'),
            NUMERO: 'QRYTST',
            fornecedor: {
              SIGLAFOR: 'query test',
              NUMERO: '99',
              docpagvc: [{
                VALOR: 1,
                DATAVENC: '2015-01-01',
                categoria: {
                  id: 'CAT1_' + order,
                  DESCEVENTO: 'query test 1'
                }
              },
                {
                  VALOR: 2,
                  DATAVENC: '2015-01-02',
                  categoria: {
                    id: 'CAT2_' + order,
                    DESCEVENTO: 'query test 2'
                  }
                }]
            },
            ClassificaçãoCad: [
              {
                Classe: 'Fornecedor'
              }
            ]
          });
      });
    });
    promise
      .then(function() {
        done();
      })
      .catch(done);
  });

  describe('querying', function() {

    it('should read the records', function(done) {
      db
        .query(sqlView('SELECT * FROM ' + db.wrap('CADASTRO'), {where: {NUMERO: 'QRYTST'}}, db.dialect))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(numberOfRecordsToGenerate);
          done();
        })
        .catch(done);
    });
    //
    //it('should read the records using like', function(done) {
    //  cadAtivo
    //    .fetch({where: {NUMERO: {like: '%YTST'}}})
    //    .then(function(recordset) {
    //      expect(recordset).to.be.a('array');
    //      expect(recordset.length).to.equal(numberOfRecordsToGenerate);
    //      done();
    //    })
    //    .catch(function(err) {
    //      done(err);
    //    });
    //});
    //
    //it('should read the records using or', function(done) {
    //  cadAtivo
    //    .fetch({
    //      where: {
    //        or: [
    //          {NUMERO: 'QRYTST'},
    //          {NOMECAD: 'QUALQUER'}
    //        ]
    //      }
    //    })
    //    .then(function(recordset) {
    //      expect(recordset).to.be.a('array');
    //      expect(recordset.length).to.equal(numberOfRecordsToGenerate);
    //      done();
    //    })
    //    .catch(function(err) {
    //      done(err);
    //    });
    //});
    //
    //it('should read the 3 records in the expected page', function(done) {
    //  cadAtivo
    //    .fetch({
    //      where: {
    //        NUMERO: 'QRYTST'
    //      },
    //      limit: 3,
    //      skip: 3,
    //      sort: ['NOMECAD']
    //    })
    //    .then(function(recordset) {
    //      expect(recordset).to.be.a('array');
    //      expect(recordset.length).to.equal(3);
    //      var i = 4;
    //      recordset.map(function(record) {
    //        expect(i++).to.equal(Number(record.NOMECAD));
    //      });
    //      done();
    //    })
    //    .catch(function(err) {
    //      done(err);
    //    });
    //});

  })
};

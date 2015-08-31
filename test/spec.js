'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.should();
var gutil = require('gulp-util');
var _ = require('lodash');

var sqlView = require('../src');
var view;

var log = gutil.log;

module.exports = function(options) {

  var db;
  var cadAtivo;
  var numberOfRecordsToGenerate = 100;
  var nextDay = new Date();
  var datesSaved = [];
  before(function(done) {
    db = options.db;
    view = sqlView(db.dialect);
    cadAtivo = require('./entities/cadastro.js')({db: db});
    log('Is generating ' + numberOfRecordsToGenerate + ' entities...');
    var promise = Promise.resolve();
    var i = 1;
    _.times(numberOfRecordsToGenerate, function() {
      var order = i++;
      var group = order % 10;
      promise = promise.then(function() {
        nextDay.setDate(nextDay.getDate() + 1);
        datesSaved.push(new Date(nextDay));
        return cadAtivo
          .create({
            NOMECAD: _.padLeft(String(order), 3, '00'),
            NUMERO: 'QRYTST',
            ENDERECO: '' + group,
            VALORLCTO: 10.01,
            DATNASC: nextDay,
            DATNASCZ: nextDay,
            DATNASCNOZ: nextDay,
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

    it('should read all the records', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO')))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(numberOfRecordsToGenerate);
          done();
        })
        .catch(done);
    });
    it('should read 10 records', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {where: {ENDERECO: '0'}}))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read all the records using like', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {where: {NUMERO: {like: '%YTST'}}}))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(numberOfRecordsToGenerate);
          done();
        })
        .catch(done);
    });
    it('should read 10 records using like', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {where: {ENDERECO: {like: '%0%'}}}))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read all the records using or', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            or: [
              {NUMERO: 'QRYTST'},
              {NOMECAD: 'QUALQUER'}
            ]
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(numberOfRecordsToGenerate);
          done();
        })
        .catch(done);
    });
    it('should read 10 records using or', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            NUMERO: 'QRYTST',
            or: [
              {ENDERECO: '0'},
              {NOMECAD: 'QUALQUER'}
            ]
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read the 3 records in the expected page', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            NUMERO: 'QRYTST'
          },
          limit: 3,
          skip: 3,
          order: ['NOMECAD']
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(3);
          var i = 4;
          recordset.map(function(record) {
            expect(i++).to.equal(Number(record.NOMECAD));
          });
          done();
        })
        .catch(done);
    });
    it('should read 10 grouped records', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          groupBy: 'ENDERECO'
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should paginate the 10 grouped records in ascending', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          groupBy: 'ENDERECO',
          limit: 3,
          skip: 3,
          order: ['ENDERECO ASC']
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(3);
          expect(recordset[0].ENDERECO).to.equal('3');
          expect(recordset[1].ENDERECO).to.equal('4');
          expect(recordset[2].ENDERECO).to.equal('5');
          done();
        })
        .catch(done);
    });
    it('should paginate the 10 grouped records in descending', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          groupBy: 'ENDERECO',
          limit: 3,
          skip: 3,
          order: 'ENDERECO DESC'
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(3);
          expect(recordset[0].ENDERECO).to.equal('6');
          expect(recordset[1].ENDERECO).to.equal('5');
          expect(recordset[2].ENDERECO).to.equal('4');
          done();
        })
        .catch(done);
    });
    it('should read 10 grouped records with some calculation', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          groupBy: 'ENDERECO as V',
          sum: 'VALORLCTO as sumV',
          avg: 'VALORLCTO as avgV',
          max: 'VALORLCTO as maxV',
          min: 'VALORLCTO as minV'
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          expect(Number(recordset[0].sumV)).to.equal(100.1);
          expect(Number(recordset[0].avgV)).to.equal(10.01);
          expect(Number(recordset[0].maxV)).to.equal(10.01);
          expect(Number(recordset[0].minV)).to.equal(10.01);
          done();
        })
        .catch(done);
    });
    it('should read the three last records', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          limit: 3,
          order: ['NOMECAD DESC']
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(3);
          expect(recordset[0].NOMECAD).to.equal('100');
          expect(recordset[1].NOMECAD).to.equal('099');
          expect(recordset[2].NOMECAD).to.equal('098');
          done();
        })
        .catch(done);
    });
    it('should read 10 records using and', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            NUMERO: 'QRYTST',
            ENDERECO: '0'
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read 10 records using contains', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            NUMERO: {
              contains: 'QRY'
            },
            ENDERECO: '0'
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read 20 records using or in a array', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            NUMERO: {
              contains: 'QRY'
            },
            ENDERECO: ['0', '1']
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(20);
          done();
        })
        .catch(done);
    });
    it('should read 80 records using or in a negate array', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            NUMERO: {
              contains: 'QRY'
            },
            ENDERECO: {not: ['0', '1']}
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(80);
          done();
        })
        .catch(done);
    });
    it('should read 10 records using <', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            NUMERO: {
              contains: 'QRY'
            },
            ENDERECO: {lt: '1'}
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read 20 records using <=', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            NUMERO: {
              contains: 'QRY'
            },
            ENDERECO: {lte: '1'}
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(20);
          done();
        })
        .catch(done);
    });
    it('should read only one field and 9 records using startsWith', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            NOMECAD: {
              startsWith: '00'
            }
          },
          select: 'NOMECAD'
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(9);
          expect(Object.keys(recordset[0]).length).to.equal(1);
          expect(recordset[0].NOMECAD).to.be.a('string');
          done();
        })
        .catch(done);
    });
  });

  describe('querying date and time', function() {
    it('should read 1 record in a date column', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            DATNASC: datesSaved[0]
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(1);
          done();
        })
        .catch(done);
    });
    it('should read 10 records in a date column', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            DATNASC: {lte: datesSaved[9]}
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read 1 record in a datetime column with timezone', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            DATNASCZ: datesSaved[0]
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(1);
          done();
        })
        .catch(done);
    });
    it('should read 10 records in a datetime column with timezone', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            DATNASCZ: {lte: datesSaved[9]}
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    //it('should read 1 record in a datetime column without timezone', function(done) {
    //  db
    //    .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
    //      where: {
    //        DATNASCNOZ: datesSaved[0]
    //      }
    //    }))
    //    .then(function(recordset) {
    //      expect(recordset).to.be.a('array');
    //      expect(recordset.length).to.equal(1);
    //      done();
    //    })
    //    .catch(done);
    //});
    it('should read 10 records in a datetime column without timezone', function(done) {
      db
        .query(view.build('SELECT * FROM ' + db.wrap('CADASTRO'), {
          where: {
            DATNASCNOZ: {lte: datesSaved[9]}
          }
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
  });

};

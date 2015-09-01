'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.should();
var gutil = require('gulp-util');
var _ = require('lodash');

var sqlView = require('../src');
var sv;

var log = gutil.log;

module.exports = function(options) {

  var db;
  var nextDay = new Date();
  var datesSaved = [];
  before(function(done) {
    db = options.db;
    sv = sqlView(db.dialect);
    log('Is generating ' + 100 + ' entities...');
    var promise = Promise.resolve();
    var i = 1;
    _.times(100, function() {
      var order = i++;
      var group = order % 10;
      promise = promise.then(function() {
        nextDay.setDate(nextDay.getDate() + 1);
        datesSaved.push(new Date(nextDay));
        return db.execute(
          'INSERT INTO person VALUES' +
          '($1, $2, $3, $4, $5, $6, $7)', [
            _.padLeft(String(order), 3, '00'),
            '' + group,
            'QRYTST',
            nextDay,
            nextDay,
            nextDay,
            {
              value: 10.01,
              type: 'number',
              maxLength: 8,
              decimals: 2
            }
          ]
        );
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
        .query(sv.build('SELECT * FROM ' + db.wrap('person')).statement)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(100);
          done();
        })
        .catch(done);
    });
    it('should read 10 records', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          ENDERECO: '0'
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read all the records using like', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: {
            like: '%YTST'
          }
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(100);
          done();
        })
        .catch(done);
    });
    it('should read 10 records using like', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {where: {ENDERECO: {like: '%0%'}}});
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read all the records using or', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          or: [
            {NUMERO: 'QRYTST'},
            {NOMECAD: 'QUALQUER'}
          ]
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(100);
          done();
        })
        .catch(done);
    });
    it('should read none record using and', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          and: [
            {NUMERO: 'QRYTST'},
            {NOMECAD: 'QUALQUER'}
          ]
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(0);
          done();
        })
        .catch(done);
    });
    it('should read 10 records using or', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: 'QRYTST',
          or: [
            {ENDERECO: '0'},
            {NOMECAD: 'QUALQUER'},
            {DATNASC: null}
          ]
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read the 3 records in the expected page', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: 'QRYTST'
        },
        limit: 3,
        skip: 3,
        order: ['NOMECAD']
      });
      db
        .query(view.statement, view.params)
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
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        groupBy: 'ENDERECO'
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should paginate the 10 grouped records in ascending', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        groupBy: 'ENDERECO',
        limit: 3,
        skip: 3,
        order: ['ENDERECO ASC']
      });
      db
        .query(view.statement, view.params)
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
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        groupBy: 'ENDERECO',
        limit: 3,
        skip: 3,
        order: 'ENDERECO DESC'
      });
      db
        .query(view.statement, view.params)
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
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        groupBy: 'ENDERECO as V',
        sum: 'VALORLCTO as sumV',
        avg: 'VALORLCTO as avgV',
        max: 'VALORLCTO as maxV',
        min: 'VALORLCTO as minV'
      });
      db
        .query(view.statement, view.params)
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
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        limit: 3,
        order: ['NOMECAD DESC']
      });
      db
        .query(view.statement, view.params)
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
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: 'QRYTST',
          ENDERECO: '0'
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read 10 records using contains', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: {
            contains: 'QRY'
          },
          ENDERECO: '0'
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read 20 records using or in a array', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: {
            contains: 'QRY'
          },
          ENDERECO: ['0', '1']
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(20);
          done();
        })
        .catch(done);
    });
    it('should read 80 records using or in a negate array', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: {
            contains: 'QRY'
          },
          ENDERECO: {not: ['0', '1']}
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(80);
          done();
        })
        .catch(done);
    });
    it('should read 10 records using <', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: {
            contains: 'QRY'
          },
          ENDERECO: {lt: '1'}
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read 20 records using <=', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: {
            contains: 'QRY'
          },
          ENDERECO: {lte: '1'}
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(20);
          done();
        })
        .catch(done);
    });
    it('should read 80 records using >', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: {
            contains: 'QRY'
          },
          ENDERECO: {gt: '1'}
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(80);
          done();
        })
        .catch(done);
    });
    it('should read 90 records using >=', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: {
            contains: 'QRY'
          },
          ENDERECO: {gte: '1'}
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(90);
          done();
        })
        .catch(done);
    });
    it('should read 100 records using not null', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NUMERO: {
            not: null
          }
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(100);
          done();
        })
        .catch(done);
    });
    it('should read 99 records using not a value', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NOMECAD: {
            not: '001'
          }
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(99);
          done();
        })
        .catch(done);
    });
    it('should throw a comparator error message', function(done) {
      try {
        var v = sv.build('SELECT * FROM ' + db.wrap('person'), {
          where: {
            NOMECAD: {
              xxx: '001'
            }
          }
        });
        log(v)
      } catch (e) {
        expect(e.message.substr(0, 18)).to.equal('Unknown comparator');
        return done();
      }
      done(new Error('Invalid view created'));
    });
    it('should read only one field and 9 records using startsWith', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NOMECAD: {
            startsWith: '00'
          }
        },
        select: 'NOMECAD'
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(9);
          expect(Object.keys(recordset[0]).length).to.equal(1);
          expect(recordset[0].NOMECAD).to.be.a('string');
          done();
        })
        .catch(done);
    });
    it('should read 1 record using endsWith', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          NOMECAD: {
            endsWith: '00'
          }
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(1);
          done();
        })
        .catch(done);
    });
  });

  describe('querying date and time', function() {
    it('should read 1 record in a date column', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          DATNASC: datesSaved[0]
        }
      });
      db
        .query(view.statement, view.params.map(function(param) {
          return {value: param, type: 'date'};
        }))
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(1);
          done();
        })
        .catch(done);
    });
    it('should read 10 records in a date column', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          DATNASC: {lte: datesSaved[9]}
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read 1 record in a datetime column with timezone', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          DATNASCZ: datesSaved[0]
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(1);
          done();
        })
        .catch(done);
    });
    it('should read 10 records in a datetime column with timezone', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          DATNASCZ: {lte: datesSaved[9]}
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
    it('should read 1 record in a datetime column without timezone', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          DATNASCNOZ: datesSaved[0]
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(1);
          done();
        })
        .catch(done);
    });
    it('should read 10 records in a datetime column without timezone', function(done) {
      var view = sv.build('SELECT * FROM ' + db.wrap('person'), {
        where: {
          DATNASCNOZ: {lte: datesSaved[9]}
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(10);
          done();
        })
        .catch(done);
    });
  });

  describe('querying a table', function() {
    it('should read only one field and 9 records using startsWith', function(done) {
      var view = sv.build('person', {
        where: {
          NOMECAD: {
            startsWith: '00'
          }
        },
        select: 'NOMECAD'
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(9);
          expect(Object.keys(recordset[0]).length).to.equal(1);
          expect(recordset[0].NOMECAD).to.be.a('string');
          done();
        })
        .catch(done);
    });
    it('should read only one record using endsWith', function(done) {
      var view = sv.build('person', {
        where: {
          NOMECAD: {
            endsWith: '00'
          }
        }
      });
      db
        .query(view.statement, view.params)
        .then(function(recordset) {
          expect(recordset).to.be.a('array');
          expect(recordset.length).to.equal(1);
          done();
        })
        .catch(done);
    });
  });

};

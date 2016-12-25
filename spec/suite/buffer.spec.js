var co = require('co');
var Buffer = require('../../src/buffer');

describe("Buffer", function() {

  beforeEach(function() {
    this.collection = [
      { id: '1', name: 'Foo Gallery' },
      { id: '2', name: 'Bar Gallery' }
    ];
  });

  describe(".all()", function() {

    it("retuns all records", function(done) {

      co(function*() {
        buffer = new Buffer(this.collection);
        expect(yield buffer.all()).toEqual(this.collection);
        done();
      }.bind(this));

    });

  });

  describe(".get()", function() {

    it("retuns all records", function(done) {

      co(function*() {
        buffer = new Buffer(this.collection);
        expect(yield buffer.get()).toEqual(this.collection);
        done();
      }.bind(this));

    });

  });

  describe(".first()", function() {

    it("finds the first record", function(done) {

      co(function*() {
        buffer = new Buffer(this.collection);
        expect(yield buffer.first()).toEqual(this.collection[0]);
        done();
      }.bind(this));

    });

  });

  describe(".count()", function() {

    it("returns the records count", function(done) {

      co(function*() {
        buffer = new Buffer(this.collection);
        expect(yield buffer.count()).toBe(2);
        done();
      }.bind(this));

    });

  });

});

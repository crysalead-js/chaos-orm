var dateFormat = require('dateformat');
var Source = require('../../src/source');
var Document = require('../../src/').Document;
var Collection = require('../../src/collection/collection');

describe("Source", function() {

  beforeEach(function() {
    this.source = new Source();
  });

  describe(".formatter()", function() {

    it("gets/sets a formatter", function() {

      var handler = function() {};
      expect(this.source.formatter('custom', 'mytype', handler)).toBe(this.source);
      expect(this.source.formatter('custom', 'mytype')).toBe(handler);

    });

    it("returns the `'_default_'` handler if no handler found", function() {

      var dflt = function() {}
      this.source.formatter('cast', '_default_', dflt);
      expect(this.source.formatter('cast', 'mytype')).toBe(dflt);

    });

  });

  describe(".formatters()", function() {

    it("gets/sets formatters", function() {

      var handlers = {
        cast: {
          'mytype': function() {}
        }
      };

      this.source.formatters(handlers);
      expect(this.source.formatters()).toEqual(handlers);

    });

  });

  describe(".convert()", function() {

    it("formats according default `'datasource'` handlers", function() {

      expect(this.source.convert('datasource', 'integer', 123)).toBe('123');
      expect(this.source.convert('datasource', 'float', 12.3)).toBe('12.3');
      expect(this.source.convert('datasource', 'decimal', 12.3)).toBe('12.3');
      var date = new Date('2014-11-21');
      expect(this.source.convert('datasource', 'date', date)).toBe('2014-11-21');
      expect(this.source.convert('datasource', 'date', '2014-11-21')).toBe('2014-11-21');
      var datetime = new Date('2014-11-21T10:20:45.000Z');
      expect(this.source.convert('datasource', 'datetime', datetime)).toBe('2014-11-21 10:20:45');
      expect(this.source.convert('datasource', 'datetime', '2014-11-21T10:20:45+02:00')).toBe('2014-11-21 08:20:45');
      expect(this.source.convert('datasource', 'boolean', true)).toBe('1');
      expect(this.source.convert('datasource', 'boolean', false)).toBe('0');
      expect(this.source.convert('datasource', 'null', null)).toBe('');
      expect(this.source.convert('datasource', 'string', 'abc')).toBe('abc');
      expect(this.source.convert('datasource', 'object', new Document())).toEqual({});
      expect(this.source.convert('datasource', 'object', new Collection())).toEqual([]);
      expect(this.source.convert('datasource', '_default_', 123)).toBe('123');
      expect(this.source.convert('datasource', '_undefined_', 123)).toBe('123');

    });

    it("formats `null` values on export", function() {

      expect(this.source.convert('datasource', 'integer', null)).toBe('');
      expect(this.source.convert('datasource', 'float', null)).toBe('');
      expect(this.source.convert('datasource', 'decimal', null)).toBe('');
      expect(this.source.convert('datasource', 'date', null)).toBe('');
      expect(this.source.convert('datasource', 'datetime', null)).toBe('');
      expect(this.source.convert('datasource', 'boolean', null)).toBe('');
      expect(this.source.convert('datasource', 'null', null)).toBe('');
      expect(this.source.convert('datasource', 'string', null)).toBe('');
      expect(this.source.convert('datasource', '_default_',null)).toBe('');
      expect(this.source.convert('datasource', '_undefined_', null)).toBe('');
      expect(this.source.convert('datasource', 'json', [1,2])).toBe('[1,2]');

    });

    it("throws an exception when exporting an invalid date", function() {

      var closure = function() {
        this.source.convert('datasource', 'date', '0000-00-00');
      }.bind(this);
      expect(closure).toThrow(new Error("Invalid date `0000-00-00`, can't be parsed."));

      closure = function() {
        this.source.convert('datasource', 'date', '2016-25-15');
      }.bind(this);
      expect(closure).toThrow(new Error("Invalid date `2016-25-15`, can't be parsed."));

      closure = function() {
        this.source.convert('datasource', 'datetime', '2016-12-15 80:90:00');
      }.bind(this);
      expect(closure).toThrow(new Error("Invalid date `2016-12-15 80:90:00`, can't be parsed."));

      closure = function() {
        this.source.convert('datasource', 'datetime', '0000-00-00 00:00:00');
      }.bind(this);
      expect(closure).toThrow(new Error("Invalid date `0000-00-00 00:00:00`, can't be parsed."));

    });

    it("formats according default `'cast'` handlers", function() {

      expect(this.source.convert('cast', 'integer', '123')).toBe(123);
      expect(this.source.convert('cast', 'float', '12.3')).toBe(12.3);
      expect(this.source.convert('cast', 'decimal', '12.3')).toBe('12.30');
      var date = new Date('2014-11-21');
      expect(this.source.convert('cast', 'date', date)).toEqual(date);
      expect(this.source.convert('cast', 'date', '2014-11-21')).toEqual(date);
      expect(this.source.convert('cast', 'date', '2014-11-21').toISOString()).toEqual('2014-11-21T00:00:00.000Z');
      var datetime = new Date('2014-11-21 10:20:45');
      expect(this.source.convert('cast', 'datetime', datetime)).toEqual(datetime);

      var offset = new Date('2014-11-21 10:20:45').getTimezoneOffset();
      var timezone = ('0' + Math.floor(Math.abs(offset)/60)).slice(-2) + ':' + ('0' + offset%60).slice(-2);
      timezone = offset > 0 ? '-' + timezone : '+' + timezone;
      var local = new Date('2014-11-21T10:20:45' + timezone);
      expect(this.source.convert('cast', 'datetime', '2014-11-21 10:20:45')).toEqual(local);

      expect(this.source.convert('cast', 'datetime', 1416565245 * 1000)).toEqual(new Date('2014-11-21T10:20:45.000Z'));
      expect(this.source.convert('cast', 'boolean', 1)).toBe(true);
      expect(this.source.convert('cast', 'boolean', 0)).toBe(false);
      expect(this.source.convert('cast', 'null', '')).toBe(null);
      expect(this.source.convert('cast', 'string', 'abc')).toBe('abc');
      expect(this.source.convert('cast', '_default_', 123)).toBe(123);
      expect(this.source.convert('cast', '_undefined_', 123)).toBe(123);
      expect(this.source.convert('cast', 'json', '[1,2]')).toEqual([1,2]);

      expect(this.source.convert('cast', 'object', {a: 'b'}).data()).toEqual({a: 'b'});

      var document = new Document();
      expect(this.source.convert('cast', 'object', document)).toBe(document);

      var date = new Date();
      expect(this.source.convert('cast', 'object', date)).toBe(date);
    });

    it("doesn't format `null` values on import", function() {

      expect(this.source.convert('cast', 'integer', null)).toBe(null);
      expect(this.source.convert('cast', 'float', null)).toBe(null);
      expect(this.source.convert('cast', 'decimal', null)).toBe(null);
      expect(this.source.convert('cast', 'date', null)).toBe(null);
      expect(this.source.convert('cast', 'datetime', null)).toBe(null);
      expect(this.source.convert('cast', 'boolean', null)).toBe(null);
      expect(this.source.convert('cast', 'null', null)).toBe(null);
      expect(this.source.convert('cast', 'string', null)).toBe(null);
      expect(this.source.convert('cast', '_default_',null)).toBe(null);
      expect(this.source.convert('cast', '_undefined_', null)).toBe(null);

    });

    it("format invalid date as `null'` on import", function() {

      expect(this.source.convert('cast', 'date', '0000-00-00')).toBe(null);
      expect(this.source.convert('cast', 'date', '2016-25-15')).toBe(null);
      expect(this.source.convert('cast', 'datetime', '2016-12-15 80:90:00')).toBe(null);
      expect(this.source.convert('cast', 'datetime', '0000-00-00 00:00:00')).toBe(null);

    });

  });

  describe(".getType()", function() {

    it("returns data type", function() {

      expect(Source.getType(123)).toBe('integer');
      expect(Source.getType(12.3)).toBe('double');
      expect(Source.getType(true)).toBe('boolean');
      expect(Source.getType(false)).toBe('boolean');
      expect(Source.getType('hello')).toBe('string');
      expect(Source.getType({})).toBe('object');
      expect(Source.getType([])).toBe('array');
      expect(Source.getType(null)).toBe('null');

    });

  });

});

import { Source } from '../..';

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

      var dflt = this.source.formatter('cast', '_default_');
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
      expect(this.source.formatters()).toBe(handlers);

    });

  });

  describe(".format()", function() {

    it("formats according default `'datasource'` handlers", function() {

      expect(this.source.format('datasource', 'id', 123)).toBe('123');
      expect(this.source.format('datasource', 'serial', 123)).toBe('123');
      expect(this.source.format('datasource', 'integer', 123)).toBe('123');
      expect(this.source.format('datasource', 'float', 12.3)).toBe('12.3');
      expect(this.source.format('datasource', 'decimal', 12.3)).toBe('12.3');
      var date = new Date('2014-11-21');
      expect(this.source.format('datasource', 'date', date)).toBe('2014-11-21T00:00:00.000Z');
      expect(this.source.format('datasource', 'date', '2014-11-21')).toBe('2014-11-21');
      var datetime = new Date('2014-11-21T10:20:45.000Z');
      expect(this.source.format('datasource', 'datetime', datetime)).toBe('2014-11-21T10:20:45.000Z');
      expect(this.source.format('datasource', 'datetime', '2014-11-21 10:20:45')).toBe('2014-11-21 10:20:45');
      expect(this.source.format('datasource', 'boolean', true)).toBe('true');
      expect(this.source.format('datasource', 'null', null)).toBe('null');
      expect(this.source.format('datasource', 'string', 'abc')).toBe('abc');
      expect(this.source.format('datasource', '_default_', 'abc')).toBe('abc');
      expect(this.source.format('datasource', '_undefined_', 'abc')).toBe('abc');

    });

    it("formats according default `'cast'` handlers", function() {

      expect(this.source.format('cast', 'id', '123')).toBe(123);
      expect(this.source.format('cast', 'serial', '123')).toBe(123);
      expect(this.source.format('cast', 'integer', '123')).toBe(123);
      expect(this.source.format('cast', 'float', '12.3')).toBe(12.3);
      expect(this.source.format('cast', 'decimal', '12.3')).toBe(12.3);
      var date = new Date('2014-11-21');
      expect(this.source.format('cast', 'date', date)).toEqual(date);
      expect(this.source.format('cast', 'date', '2014-11-21')).toEqual(date);
      var datetime = new Date('2014-11-21 10:20:45');
      expect(this.source.format('cast', 'datetime', datetime)).toEqual(datetime);
      expect(this.source.format('cast', 'datetime', '2014-11-21 10:20:45')).toEqual(datetime);
      expect(this.source.format('cast', 'datetime', 1416565245 * 1000)).toEqual(datetime);
      expect(this.source.format('cast', 'boolean', 'TRUE')).toBe(true);
      expect(this.source.format('cast', 'null', 'NULL')).toBe(null);
      expect(this.source.format('cast', 'string', 'abc')).toBe('abc');
      expect(this.source.format('cast', '_default_', 'abc')).toBe('abc');
      expect(this.source.format('cast', '_undefined_', 'abc')).toBe('abc');

    });

  });

});

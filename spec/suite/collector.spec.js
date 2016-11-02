import { Collector } from '../../src';

describe("Collector", function() {

  describe(".get()/.set()", function() {

    it("sets values", function() {

      var collector = new Collector();
      expect(collector.set(123, 'Hello')).toBe(collector);
      expect(collector.get(123)).toBe('Hello');

    });

    it("throws an error for unexisting id", function() {

      var closure = function() {
        var collector = new Collector();
        expect(collector.get(123)).toBe(undefined);
      };

      expect(closure).toThrow(new Error("No collected data with UUID `'123'` in this collector."));

    });

  });

  describe(".has()", function() {

    it("returns `true` if a element has been setted", function() {

      var collector = new Collector();
      expect(collector.set(123, 'Hello')).toBe(collector);
      expect(collector.has(123)).toBe(true);

    });


    it("returns false if a element doesn't exist", function() {

      var collector = new Collector();
      expect(collector.has(123)).toBe(false);

    });

  });

  describe(".remove()", function() {

    it("removes items", function() {

      var collector = new Collector();
      expect(collector.set(123, 'Hello')).toBe(collector);
      expect(collector.remove(123)).toBe(collector);
      expect(collector.has(123)).toBe(false);

    });

  });

});
var co = require('co');
var Collection = require('../../../src/index').Collection;
var Model = require('../../../src/index').Model;
var Document = require('../../../src/index').Document;
var Image = require('../../fixture/model/image');

class MyModel extends Model {
  static _define(schema) {
    schema.lock(false);
  }
};

describe("Collection", function() {

  describe(".constructor()", function() {

    it("loads the data", function() {

      var collection = new Collection({ data: ['foo'] });
      expect(collection.get(0)).toBe('foo');
      expect(collection.count()).toBe(1);
      expect(collection.length).toBe(1);

    });

  });

  describe(".parents()", function() {

    it("gets the parents", function() {

      var parent = new Document();
      var collection = new Collection();
      parent.set('value', collection);
      expect(collection.parents().has(parent)).toBe(true);
      expect(collection.parents().get(parent)).toBe('value');

    });

  });

  describe(".unsetParent()", function() {

    it("unsets a parent", function() {

      var parent = new Document();
      var collection = new Collection();
      parent.set('value', collection);
      parent.unset('value');
      expect(collection.parents().has(parent)).toBe(false);

    });

  });

  describe(".disconnect()", function() {

    it("removes a document from its graph", function() {

      var parent = new Document();
      var collection = new Collection();
      parent.set('value', collection);
      collection.disconnect();
      expect(collection.parents().has(parent)).toBe(false);
      expect(parent.has('value')).toBe(false);

    });

  });

  describe(".basePath()", function() {

    it("returns the root path", function() {

      var collection = new Collection({ basePath: 'items' });
      expect(collection.basePath()).toBe('items');

    });

  });

  describe(".schema()", function() {

    it("returns the schema", function() {

      var schema = new Function();
      var collection = new Collection({ schema: schema });
      expect(collection.schema()).toBe(schema);

    });

  });

  describe(".meta()", function() {

    it("returns the meta attributes", function() {

      var meta ={ page: 5, limit: 10 };
      var collection = new Collection({ meta: meta });
      expect(collection.meta()).toEqual(meta);

    });

  });

  describe(".invoke()", function() {

    beforeEach(function() {
      this.collection = new Collection();

      for (var i = 0; i < 5; i++) {
        var object = { hello: function() { return 'world'; }};
        this.collection.push(object);
      }
    });

    it("dispatches a method against all items in the collection", function() {

      var result = this.collection.invoke('hello');
      expect(result).toEqual(['world', 'world', 'world', 'world', 'world']);

    });

  });

  describe(".apply()", function() {

    it("applies a filter on a collection", function() {

      var collection = new Collection({ data: [1, 2, 3, 4, 5] });
      var filter = function(item) { return ++item; };
      var result = collection.apply(filter);

      expect(result).toBe(collection);
      expect(result.data()).toEqual([2, 3, 4, 5, 6]);

    });

  });

  describe(".filter()", function() {

    it("extracts items from a collection according a filter", function() {

      var collection = new Collection({
        data: Array(10).fill(1, 0, 10).concat(Array(10).fill(2, 0, 10))
      });

      var filter = function(item) { return item === 1; };

      var result = collection.filter(filter);
      expect(result instanceof Collection).toBe(true);
      expect(result.data()).toEqual(Array(10).fill(1, 0, 10));

    });

  });

  describe(".map()", function() {

    it("applies a Closure to a copy of all data in the collection", function() {

      var collection = new Collection({ data: [1, 2, 3, 4, 5] });
      var filter = function(item) { return ++item; };
      var result = collection.map(filter);

      expect(result).not.toBe(collection);
      expect(result.data()).toEqual([2, 3, 4, 5, 6]);

    });

  });

  describe(".reduce()", function() {

    it("reduces a collection down to a single value", function() {

      var collection = new Collection({ data: [1, 2, 3] });
      var filter = function(memo, item) { return memo + item; };

      expect(collection.reduce(filter, 0)).toBe(6);
      expect(collection.reduce(filter, 1)).toBe(7);

    });

  });

  describe(".slice()", function() {

    it("extracts a slice of items", function() {

      var collection = new Collection({ data: [1, 2, 3, 4, 5] });
      var result = collection.slice(2, 4);

      expect(result).not.toBe(collection);
      expect(result.data()).toEqual([3, 4]);

    });

  });

  describe(".splice()", function() {

    it("removes some items", function() {

      var collection = new Collection({ data: [1, 2, 3, 4, 5] });
      collection.splice(2, 2);

      expect(collection.data()).toEqual([1, 2, 5]);
      expect(collection.modified()).toBe(true);

    });

  });

  describe(".sort()", function() {

    it("sorts a collection", function() {

      var collection = new Collection({ data: [5, 3, 4, 1, 2] });
      var result = collection.sort();
      expect(result.data()).toEqual([1, 2, 3, 4, 5]);

    });

    it("sorts a collection using a compare function", function() {

      var collection = new Collection({ data: ['Alan', 'Dave', 'betsy', 'carl'] });
      var result = collection.sort(function(a, b) {
        return a < b ? 1 : (a > b ? -1 : 0);
      });
      expect(result.data()).toEqual(['carl', 'betsy', 'Dave', 'Alan']);

    });

  });

  describe(".has()", function() {

    it("returns true if a element exist", function() {

      var collection = new Collection();
      collection.push('foo');
      collection.push(null);

      expect(collection.has(0)).toBe(true);
      expect(collection.has(1)).toBe(true);

    });

    it("returns false if a element doesn't exist", function() {

      var collection = new Collection();
      expect(collection.has(0)).toBe(false);

    });

    it("checks if a value has been setted using a dotted notation", function() {

      var collection = MyModel.create([
        { name: 'hello' },
        { name: 'world', item: { a: 'b'} }
      ], {type: 'set'});

      expect(collection.has('0.name')).toBe(true);
      expect(collection.has('1.name')).toBe(true);
      expect(collection.has('1.item.a')).toBe(true);

    });

  });

  describe(".push()", function() {

    it("pushes elements", function() {

      var collection = new Collection();
      expect(collection.push('foo')).toBe(collection);
      expect(collection.get(0)).toBe('foo');
      expect(collection.count()).toBe(1);

    });

  });

  describe(".get()", function() {

    it("returns the plain data array", function() {

      var data = ['one', 'two', 'three'];
      var collection = new Collection({ data: data });
      expect(collection.get()).toEqual(data);

    });

  });

  describe(".set()/get()", function() {

    it("updates at a specific key", function() {

      var collection = new Collection();
      collection.push('foo');
      expect(collection.get(0)).toBe('foo');

      expect(collection.set(0, 'foo updated')).toBe(collection);
      expect(collection.get(0)).toBe('foo updated');

    });

    it("emits modified events", function(done) {

      var collection = new Collection();
      var document = new Document();

      collection.on('modified', function(name) {
        done();
      });

      collection.push(document);

    });

    it("supports recursive structure when emitting modified events", function(done) {

      var collection = new Collection();
      var document = new Document();
      document.set('collection', collection);

      var received = 0;

      var check = function() {
        if (received === 2) {
          done();
        }
      };

      collection.on('modified', function(name) {
        if (name.toString() === [0].toString()) {
          received++;
        }
        check();
      });

      document.on('modified', function(name) {
        if (name.toString() === ['collection', 0].toString()) {
          received++;
        }
        check();
      });

      collection.push(new Document());

    });

    context("when a schema is defined", function() {

      it("autoboxes setted data", function() {

        var collection = new Collection({
          schema: MyModel.definition()
        });

        collection.push({
          id: 1,
          title: 'first record',
          enabled: 1,
          created: new Date()
        });

        var entity = collection.get(0);
        expect(entity instanceof MyModel).toBe(true);
        expect(entity.parents().get(collection)).toBe(0);
        expect(entity.basePath()).toBe(undefined);

      });

    });

  });

  describe(".watch()", function() {

    it("watches collection", function(done) {

      var collection = new Collection();
      var document = new Document();

      collection.watch(function(path) {
        expect(path).toEqual([0]);
        done();
      });

      collection.push(document);

    });

  });

  describe(".unset()", function() {

    it("unsets items", function() {

      var collection = new Collection({ data: [5, 3, 4, 1, 2] });
      collection.unset(1);
      collection.unset(1);

      expect(collection.count()).toBe(3);
      expect(collection.data()).toEqual([5, 1, 2]);

    });

    it("unsets items rebuild indexes", function() {

      var collection = new Collection({ data: [5, 3, 4, 1, 2] });
      collection.unset(1);
      collection.unset(1);

      expect(collection.count()).toBe(3);
      expect(collection.data()).toEqual([5, 1, 2]);
      expect(collection.keys()).toEqual([0, 1, 2]);

    });

    it("unsets items using a dotted notation", function() {

      var collection = MyModel.create([
        { name: 'hello' },
        { name: 'world' }
      ], {type: 'set'});

      collection.unset('1.name');

      expect(collection.has('0.name')).toBe(true);
      expect(collection.has('1.name')).toBe(false);

    });

  });

  describe(".keys()", function() {

    it("returns the item keys", function() {

      var collection = new Collection({ data: ['one', 'two', 'three' ] });
      expect(collection.keys()).toEqual([0, 1, 2]);

    });

  });

  describe(".count()", function() {

      it("returns 0 on empty", function() {

          var collection = new Collection();
          expect(collection.count()).toBe(0);
          expect(collection.length).toBe(0);

      });

      it("returns the number of items in the collection", function() {

          var collection = new Collection({ data: [5 ,null, 4, true, false, 'bob'] });
          expect(collection.count()).toBe(6);
          expect(collection.length).toBe(6);

      });

  });

  describe(".indexBy()", function() {

    it("indexes a collection using index number", function() {

      var collection = new Collection({ data: [
        new Document({ data: { id: 1, type: 'type1'} }),
        new Document({ data: { id: 2, type: 'type2'} }),
        new Document({ data: { id: 3, type: 'type1'} })
      ] });

      var indexes = collection.indexBy('type', true);
      expect(indexes).toEqual({
        type1: [0, 2],
        type2: [1]
      });

    });

    it("indexes a collection using values", function() {

      var a, b, c;
      var collection = new Collection({ data: [
        a = new Document({ data: { id: 1, type: 'type1'} }),
        b = new Document({ data: { id: 2, type: 'type2'} }),
        c = new Document({ data: { id: 3, type: 'type1'} })
      ] });

      var indexes = collection.indexBy('type');
      expect(indexes).toEqual({
        type1: [a, c],
        type2: [b]
      });

    });

  });

  describe(".indexOf()", function() {

    it("returns the index of an item", function() {

      var a, b, c;

      var collection = new Collection({ data: [
        a = new MyModel({ data: { id: 1, type: 'type1'} }),
        b = new MyModel({ data: { id: 2, type: 'type2'} }),
        c = new MyModel({ data: { id: 3, type: 'type1'} })
      ] });

      expect(collection.indexOf(a)).toBe(0);
      expect(collection.indexOf(b)).toBe(1);
      expect(collection.indexOf(c)).toBe(2);

    });

  });

  describe(".lastIndexOf()", function() {

    it("returns the last index of an item", function() {

      var a, b;

      var collection = new Collection({ data: [
        a = new MyModel({ data: { id: 1, type: 'type1'} }),
        b = new MyModel({ data: { id: 2, type: 'type2'} }),
        a
      ] });

      expect(collection.lastIndexOf(a)).toBe(2);

    });

  });

  describe(".indexOfId()", function() {

    it("returns the index of an entity with a defined id", function() {

      var collection = new Collection({ data: [
        new MyModel({ data: { id: 1, type: 'type1'} }),
        new MyModel({ data: { id: 2, type: 'type2'} }),
        new MyModel({ data: { id: 3, type: 'type1'} })
      ] });

      expect(collection.indexOfId(1)).toBe(0);
      expect(collection.indexOfId(2)).toBe(1);
      expect(collection.indexOfId(3)).toBe(2);

    });

    it("throws an error when collection doesn't contain documents", function() {

      closure = function() {
        var collection = new Collection({ data: ['a', 'b', 'c'] });
        collection.indexOfId(1);
      };
      expect(closure).toThrow(new Error("Error, `indexOfId()` is only available on models."));

    });

  });

  describe(".merge()", function() {

    it("merges two collection", function() {

      var collection = new Collection({ data: [1, 2, 3] });
      var collection2 = new Collection({ data: [4, 5, 6, 7] });
      collection.merge(collection2);

      expect(collection.data()).toEqual([1, 2, 3, 4, 5, 6, 7]);

    });

  });

  describe(".embed()", function() {

    it("delegates the call up to the schema instance", function() {

      var schema = { embed: function() {} };
      var spy = spyOn(schema, 'embed');

      MyModel.definition(schema);

      var galleries = MyModel.create({}, { type: 'set' });

      galleries.embed(['relation1.relation2']);
      expect(spy).toHaveBeenCalledWith(galleries, ['relation1.relation2']);

      MyModel.reset();

    });

  });

  describe(".data()", function() {

    it("calls `to()`", function() {

      var collection = new Collection({ data: [1] });
      var spy = spyOn(collection, 'to').and.callThrough();

      var options = {};
      expect(collection.data(options)).toEqual([1]);
      expect(spy).toHaveBeenCalledWith('array', options);

    });

  });

  describe(".original()", function() {

    it("return the original data", function() {

      var collection = new Collection({ data: [1] });

      collection.unset(0);
      expect(collection.data()).toEqual([]);
      expect(collection.original()).toEqual([1]);

    });

  });

  describe(".save()", function() {

    it("saves each item of a collection", function(done) {

      co(function*() {
        var collection = Image.create([
          { name: 'amiga_1200.jpg', title: 'Amiga 1200' },
          { name: 'amiga_1260.jpg', title: 'Amiga 1260' },
        ], { type: 'set' });

        var schema = Image.definition();

        var spy1 = spyOn(collection, 'validates').and.returnValue(Promise.resolve(true));
        var spy2 = spyOn(schema, 'save').and.returnValue(Promise.resolve(true));

        expect(yield collection.save()).toBe(true);
        expect(spy1).toHaveBeenCalledWith({
          validate: true,
          embed: false
        });

        expect(spy2).toHaveBeenCalledWith(collection, {
          validate: true,
          embed: false
        });
        done();
      }.bind(this));

    });

  });

  describe("::toArray()", function() {

    it("converts a collection to an array", function() {

      var collection = new Collection({ data: [1, 2, 3, 4, 5] });
      expect(Collection.toArray(collection)).toEqual([1, 2, 3, 4, 5]);

    });

    it("converts objects which support toString", function() {

      var collection = new Collection({ data: [{}] });
      expect(Collection.toArray(collection)).toEqual(['[object Object]']);

    });

    it("converts objects using handlers", function() {

      var handlers = {
        Date: function(value) { return 'world'; }
      };
      var collection = new Collection({ data: [new Date()] });
      var d = new Date();

      expect(Collection.toArray(collection, { handlers: handlers })).toEqual(['world']);

    });

    it("doesn't convert unsupported objects", function() {

      var object = Object.create(null);
      var collection = new Collection({ data: [object] });
      expect(Collection.toArray(collection)).toEqual([object]);

    });

    it("converts nested collections", function() {

      var collection = new Collection({
        data: [
          1, 2, 3, new Collection({ data: [4, 5, 6] })
        ]
      });
      expect(Collection.toArray(collection)).toEqual([1, 2, 3, [4, 5, 6]]);

    });

    it("converts mixed nested collections & arrays", function() {

      var collection = new Collection({
        data: [
          1, 2, 3, [
            new Collection({ data: [4, 5, 6] })
          ]
        ]
      });
      expect(Collection.toArray(collection)).toEqual([1, 2, 3, [[4, 5, 6]]]);

    });

  });

});

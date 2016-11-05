var Collection = require('../../src/collection/collection');
var Conventions = require('../../src/conventions');
var Source = require('../../src/source');
var Schema = require('../../src/schema');
var Model = require('../../src/').Model;

class MyModel extends Model {
  static _define(schema) {
    schema.locked(false);
  }
}

class MySchema extends Schema {};

MyModel._definition = MySchema;

describe("Model", function() {

  afterEach(function() {
    MyModel.reset();
  });

  describe(".conventions()", function() {

    it("gets/sets a conventions", function() {

      var conventions = {};
      MyModel.conventions(conventions);
      expect(MyModel.conventions()).toBe(conventions);

    });

  });

  describe(".connection()", function() {

    it("gets/sets a connection", function() {

      var connection = {};
      MyModel.connection(connection);
      expect(MyModel.connection()).toBe(connection);

    });

  });

  describe(".create()", function() {

    it("creates an entity", function() {

      var data = { title: 'Amiga 1200' };
      var entity = MyModel.create(data);

      expect(entity instanceof MyModel).toBe(true);
      expect(entity.data()).toEqual(data);
      expect(entity.exists()).toBe(false);

    });

    it("creates an existing entity", function() {

      var data = { id: '1', title: 'Amiga 1200' };
      var entity = MyModel.create(data, { exists: true });

      expect(entity instanceof MyModel).toBe(true);
      expect(entity.data()).toEqual(data);
      expect(entity.exists()).toBe(true);

    });

    it("creates a collection of entities", function() {

      var data = [
        { title: 'Amiga 1200' },
        { title: 'Las Vegas' }
      ];
      var collection = MyModel.create(data, { type: 'set' });

      expect(collection instanceof Collection).toBe(true);
      expect(collection.data()).toEqual(data);

      collection.forEach(function(entity) {
        expect(entity instanceof MyModel).toBe(true);
        expect(entity.exists()).toBe(false);
      });

    });

    it("creates a collection of existing entities", function() {

      var data = [
        { id: '1', title: 'Amiga 1200' },
        { id: '2', title: 'Las Vegas' }
      ];

      var collection = MyModel.create(data, { type: 'set', exists: true });

      expect(collection instanceof Collection).toBe(true);
      expect(collection.data()).toEqual(data);

      collection.forEach(function(entity) {
        expect(entity instanceof MyModel).toBe(true);
        expect(entity.exists()).toBe(true);
      });

    });

  });

  describe(".query()", function() {

    it("gets/sets the default query parameters", function() {

      MyModel.query({ field: 'value' });
      expect(MyModel.query()).toEqual({ field: 'value' });
      MyModel.query({});

    });

  });

  describe(".find()", function() {

    beforeEach(function() {
      var schema = MyModel.definition();
      var query = this.query = {
        method1: function() {},
        method2: function() {}
      };

      schema.query = function() {
        return query;
      };
    });

    it("returns a query instance from the schema class", function() {

      expect(MyModel.find()).toBe(this.query);

    });

    it("merges default query parameters on find", function() {

      var schema = MyModel.definition();

      MyModel.query({ method1: 'param1' });

      var stub = spyOn(schema, 'query');

      MyModel.find({
        method2: 'param2'
      });

      expect(stub).toHaveBeenCalledWith({
        query: {
          method1: 'param1',
          method2: 'param2'
        }
      });

    });

  });

  describe(".first()", function() {

    beforeEach(function() {

      var schema = MyModel.definition();
      var query = this.query = {
        first: function() {}
      };

      schema.query = function() {
        return query;
      };

    });

    it("delegates to `.find`", function() {

      var schema = MyModel.definition();

      var schemaSpy = spyOn(schema, 'query').and.callThrough();
      var querySpy = spyOn(this.query, 'first');

      MyModel.first({ field: 'value' }, { fetch: 'options' });

      expect(schemaSpy).toHaveBeenCalledWith({ query: { field: 'value' } });
      expect(querySpy).toHaveBeenCalledWith({ fetch: 'options' });

    });

  });

  describe(".load()", function() {

    beforeEach(function() {
      var schema = MyModel.definition();
      var query = this.query = {
        first: function() {}
      };

      schema.query = function() {
        return query;
      };
    });

    it("delegates to `.find`", function() {

      var myModelSpy = spyOn(MyModel, 'find').and.callThrough();
      var querySpy = spyOn(this.query, 'first');

      MyModel.load(1, { option: 'value' }, { fetch: 'options' });

      expect(myModelSpy).toHaveBeenCalledWith({
        conditions: { id: 1 },
        option: 'value'
      });
      expect(querySpy).toHaveBeenCalledWith({ fetch: 'options' });

    });

  });

  describe(".all()", function() {

    beforeEach(function() {
      var schema = MyModel.definition();
      var query = this.query = {
        all: function() {}
      };

      schema.query = function() {
        return query;
      };
    });

    it("delegates to `.all`", function() {

      var myModelSpy = spyOn(MyModel, 'find').and.callThrough();
      var querySpy = spyOn(this.query, 'all');

      MyModel.all({ query: { field: 'value' } }, { fetch: 'options' });

      expect(myModelSpy).toHaveBeenCalledWith({ query: { field: 'value' } });
      expect(querySpy).toHaveBeenCalledWith({ fetch: 'options' });

    });

  });

  describe(".definition()", function() {

    it("returns the model", function() {

      var schema = MyModel.definition();
      expect(schema instanceof Schema).toBe(true);
      expect(schema).toBe(MyModel.definition());

    });

    it("gets/sets a schema", function() {

      var schema = {};
      MyModel.definition(schema);
      expect(MyModel.definition()).toBe(schema);

    });

  });

});
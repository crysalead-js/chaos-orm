import Collection from '../../src/collection/collection';
import Schema from '../../src/schema';
import Model from '../../src/model';

class MyModel extends Model {}

describe("Model", function() {

  afterEach(function() {
    MyModel.reset();
  });

  describe("::config()", function() {

    it("configures the model", function() {

      var schema = {};
      var query = { option: 'value' };
      var connection = {};
      var conventions = {};

      MyModel.config({
        schema: schema,
        query: query,
        connection: connection,
        conventions: conventions
      });

      expect(MyModel.schema()).toBe(schema);
      expect(MyModel.query()).toBe(query);
      expect(MyModel.connection()).toBe(connection);
      expect(MyModel.conventions()).toBe(conventions);

      MyModel.reset();

      expect(MyModel.schema()).not.toBe(schema);
      expect(MyModel.query()).toEqual({});
      expect(MyModel.connection()).toBe(undefined);
      expect(MyModel.conventions()).not.toBe(conventions);

    });

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
      var schema = MyModel.schema();
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

      var schema = MyModel.schema();

      MyModel.query({ method1: 'param1' });

      spyOn(schema, 'query');

      MyModel.find({
        method2: 'param2'
      });

      expect(schema.query).toHaveBeenCalledWith({
        query: {
          method1: 'param1',
          method2: 'param2'
        }
      });

    });

  });

  describe(".first()", function() {

    beforeEach(function() {

      var schema = MyModel.schema();
      var query = this.query = {
        first: function() {}
      };

      schema.query = function() {
        return query;
      };

    });

    it("delegates to `.find`", function() {

      var schema = MyModel.schema();

      spyOn(schema, 'query').and.callThrough();
      spyOn(this.query, 'first').and.callThrough();

      MyModel.first({ field: 'value' }, { fetch: 'options' });

      expect(schema.query).toHaveBeenCalledWith({ query: { field: 'value' } });
      expect(this.query.first).toHaveBeenCalledWith({ fetch: 'options' });

    });

  });

  describe(".id()", function() {

    beforeEach(function() {
      var schema = MyModel.schema();
      var query = this.query = {
        first: function() {}
      };

      schema.query = function() {
        return query;
      };
    });

    it("delegates to `.find`", function() {

      spyOn(MyModel, 'find').and.callThrough();
      spyOn(this.query, 'first').and.callThrough();

      MyModel.id(1, { option: 'value' }, { fetch: 'options' });

      expect(MyModel.find).toHaveBeenCalledWith({
        conditions: { id: 1 },
        option: 'value'
      });
      expect(this.query.first).toHaveBeenCalledWith({ fetch: 'options' });

    });

  });

  describe(".all()", function() {

    beforeEach(function() {
      var schema = MyModel.schema();
      var query = this.query = {
        all: function() {}
      };

      schema.query = function() {
        return query;
      };
    });

    it("delegates to `.all`", function() {

      spyOn(MyModel, 'find').and.callThrough();
      spyOn(this.query, 'all').and.callThrough();

      MyModel.all({ query: { field: 'value' } }, { fetch: 'options' });

      expect(MyModel.find).toHaveBeenCalledWith({ query: { field: 'value' } });
      expect(this.query.all).toHaveBeenCalledWith({ fetch: 'options' });

    });

  });

  describe(".schema()", function() {

    it("returns the model", function() {

      var schema = MyModel.schema();
      expect(schema instanceof Schema).toBe(true);
      expect(schema).toBe(MyModel.schema());

    });

    it("gets/sets a schema", function() {

      var schema = {};
      MyModel.schema(schema);
      expect(MyModel.schema()).toBe(schema);

    });

  });

  describe(".relations()", function() {

    it("delegates calls to schema", function() {

      var schema = MyModel.schema();

      spyOn(schema, 'relations').and.callThrough();

      MyModel.relations('hasMany');

      expect(schema.relations).toHaveBeenCalledWith('hasMany');

    });

  });

  describe(".relation()", function() {

    it("delegates calls to schema", function() {

      var schema = MyModel.schema();
      schema.bind('abc', {
        relation: 'hasOne',
        to: 'TargetModel'
      });

      spyOn(schema, 'relation').and.callThrough();

      MyModel.relation('abc');

      expect(schema.relation).toHaveBeenCalledWith('abc');

    });

  });

});
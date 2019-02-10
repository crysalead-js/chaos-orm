var co = require('co');
var Schema = require('../../src/schema');
var Model = require('../../src/').Model;
var Document = require('../../src/').Document;
var Collection = require('../../src/').Collection;

describe("Document", function() {

  describe(".constructor()", function() {

    it("loads the data", function() {

      var date = new Date('2014-10-26 00:25:15');

      var document = new Document({ data: {
        title: 'Hello',
        body: 'World',
        created: date
      }});

      expect(document.get('title')).toBe('Hello');
      expect(document.get('body')).toBe('World');
      expect(document.get('created')).toBe(date);

    });

  });

  describe(".self()", function() {

    it("returns the document class name", function() {

      var document = new Document();
      expect(document.self()).toBe(Document);

    });

  });

  describe(".parents()", function() {

    it("gets the parents", function() {

      var parent = new Document();
      var document = new Document();
      parent.set('value', document);
      expect(document.parents().has(parent)).toBe(true);
      expect(document.parents().get(parent)).toBe('value');

    });

  });

  describe(".unsetParent()", function() {

    it("unsets a parent", function() {

      var parent = new Document();
      var document = new Document();
      parent.set('value', document);
      parent.unset('value');
      expect(document.parents().has(parent)).toBe(false);

    });

  });

  describe(".disconnect()", function() {

    it("removes a document from its graph", function() {

      var parent = new Document();
      var document = new Document();
      parent.set('value', document);
      document.disconnect();
      expect(document.parents().has(parent)).toBe(false);
      expect(parent.has('value')).toBe(false);

    });

    it("removes a document from its collection", function() {

      var parent = new Collection();
      var document1 = new Document();
      var document2 = new Document();
      var document3 = new Document();
      parent.push(document1);
      parent.push(document2);
      parent.push(document3);
      document1.disconnect();
      document2.disconnect();
      document3.disconnect();
      expect(parent.length).toBe(0);

    });

  });

  describe(".basePath()", function() {

    it("returns the root path", function() {

      var document = new Document({ basePath: 'items' });
      expect(document.basePath()).toBe('items');

    });

  });

  describe(".get()", function() {

      it("gets a value", function() {

        var document = new Document();
        expect(document.set('title', 'Hello')).toBe(document);
        expect(document.get('title')).toBe('Hello');

      });

      it("gets a virtual value", function() {

        var schema = new Schema();
        schema.column('a', { type: 'string', virtual: true});

        var document = new Document({schema: schema});
        expect(document.set('a', 1)).toBe(document);
        expect(document.get('a')).toBe('1');

      });

      it("gets all values but virtuals", function() {

        var schema = new Schema();

        var document = new Document();

        expect(document.set({
          a: 1,
          b: 2,
          c: 3
        })).toBe(document);

        expect(document.get()).toEqual({
          a: 1,
          b: 2,
          c: 3
        });

      });

      it("returns `null` for undefined field", function() {

        var document = new Document();
        expect(document.get('value')).toBe(null);
        expect(document.get('nested.value')).toBe(null);

      });

      it("throws an error for undefined field with locked schema", function() {

        var closure = function() {
          var schema = new Schema();
          var document = new Document({ schema: schema });
          document.set('value', 'something');
          document.get('value');
        };

        expect(closure).toThrow(new Error("Missing schema definition for field: `value`."));

      });

      it("throws an error when the path is invalid", function() {

        var closure = function() {
          var document = new Document();
          document.set('value', 'Hello World');
          document.get('value.invalid');
        };

        expect(closure).toThrow(new Error("The field: `value` is not a valid document or entity."));

      });

  });

  describe(".set()", function() {

    it("sets values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var document = new Document();
      expect(document.set('title', 'Hello')).toBe(document);
      expect(document.set('body', 'World')).toBe(document);
      expect(document.set('created', date)).toBe(document);

      expect(document.get('title')).toBe('Hello');
      expect(document.get('body')).toBe('World');
      expect(document.get('created')).toBe(date);

    });

    it("sets nested arbitraty value in cascade", function() {

      var data = new Document();
      data.set('a.nested.value', 'hello');

      expect(data.data()).toEqual({
        a: {
          nested: {
            value: 'hello'
          }
        }
      });

    });

    it("returns `null` for undefined fields", function() {

      var document = new Document();
      expect(document.get('foo')).toBe(null);

    });

    it("sets an array of values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var document = new Document();
      expect(document.set({
        title: 'Hello',
        body: 'World',
        created: date
      })).toBe(document);
      expect(document.get('title')).toBe('Hello');
      expect(document.get('body')).toBe('World');
      expect(document.get('created')).toBe(date);

    });

    it("returns all raw datas with no parameter", function() {

      var timestamp = 1446208769;

      var document = new Document({
        data: {
          title: 'Hello',
          body: 'World',
          created: timestamp
        }
      });
      expect(document.get()).toEqual({
        title: 'Hello',
        body: 'World',
        created: timestamp
      });

    });

    it("sets and gets the 0 field name", function() {

      var document = new Document();
      document.set('0', 'zero');
      expect(document.get('0')).toBe('zero');

      document.set(0, 'zero');
      expect(document.get(0)).toBe('zero');

    });

    it("throws an exception if the field name is not valid", function() {

      var closure = function() {
        var document = new Document();
        document.get('');
      };
      expect(closure).toThrow(new Error("Field name can't be empty."));

    });

    it("emits modified events", function(done) {

      var document = new Document();
      document.on('modified', function(document, uuid) {
        done();
      });

      document.set('a.nested.value', 'hello');

    });

    it("correctly sets parents", function() {

      var schema = new Schema();
      schema.column('data', { type: 'object', default: {} });
      schema.column('data.*', { type: 'object', default: {} });
      schema.column('data.*.checked', { type: 'boolean' });
      schema.column('data.*.test', { type: 'object', default: {} });
      schema.column('data.*.test.*', { type: 'object', default: {} });
      schema.column('data.*.test.*.nested', { type: 'object', default: {} });
      schema.column('data.*.test.*.nested.*', { type: 'boolean', array: true });
      schema.locked(true);

      var document = new Document({ schema: schema });

      expect(document.parents().size).toBe(0);
      expect(document.get('data').parents().has(document)).toBe(true);
      expect(document.get('data.value1').parents().has(document.get('data'))).toBe(true);
      expect(document.get('data.value1.test').parents().has(document.get('data'))).toBe(false);
      expect(document.get('data.value1.test').parents().has(document.get('data.value1'))).toBe(true);
      expect(document.get('data.value3.test.deeply.nested').parents().has(document.get('data.value3.test.deeply'))).toBe(true);

    });

    it("sets documents by references", function() {

      var document1 = new Document();
      var document2 = new Document();

      document1.set('data.value1.test', true);
      document2.set('data', document1.get('data'));

      expect(document1.get('data')).toBe(document2.get('data'));

      document2.set('data.value1.test', false);

      expect(document1.get('data.value1.test')).toBe(false);
      expect(document2.get('data.value1.test')).toBe(false);

    });

    it("casts objects according JSON casting handlers", function() {

      var schema = new Schema();
      schema.column('holidays', { type: 'string', array: true, format: 'json' });

      document = new Document({ schema: schema });
      holidays = [
        'allSaintsDay',
        'armisticeDay',
        'ascensionDay',
        'assumptionOfMary',
        'bastilleDay',
        'christmasDay',
        'easterMonday',
        'internationalWorkersDay',
        'newYearsDay',
        'pentecostMonday',
        'victoryInEuropeDay'
      ];
      document.set('holidays', holidays);
      expect(document.get('holidays').data()).toEqual(holidays);

    });

    it("casts array of objects according JSON casting handlers", function() {

      schema = new Schema();
      schema.column('events', { type: 'object', array: true });
      schema.column('events.from', { type: 'string' });
      schema.column('events.to', { type: 'string' });

      var document = new Document({ schema: schema });
      var events = [
          { from: '08:00', to: '10:00' },
          { from: '12:00', to: '16:00' }
      ];
      document.set('events', events);
      expect(document.get('events.0')).toBeAnInstanceOf(Document);
      expect(document.get('events.1')).toBeAnInstanceOf(Document);
      expect(document.get('events').data()).toEqual(events);

    });

    it("casts array of custom objects according JSON casting handlers", function() {

      class Event extends Document {
        static _define(schema) {
          schema.column('from', { type: 'string' });
          schema.column('to', { type: 'string' });
        }
      };

      var schema = new Schema();
      schema.column('events', { type: 'object', array: true, class: Event  });

      var document = new Document({ schema: schema });
      var events = [
          { from: '08:00', to: '10:00' },
          { from: '12:00', to: '16:00' }
      ];
      document.set('events', events);
      expect(document.get('events.0')).toBeAnInstanceOf(Event);
      expect(document.get('events.1')).toBeAnInstanceOf(Event);
      expect(document.get('events').data()).toEqual(events);

    });

    it("casts data in nested array", function() {

      schema = new Schema();
      schema.column('data', { type: 'object', array: true });
      schema.column('data.count', { type: 'integer' });
      schema.column('data.value', { type: 'integer' });

      var document = new Document({ schema: schema });
      var data = [
        { count: '09', value: 5 }
      ];
      document.set('data', data);
      expect(document.get('data').get(0).get('count')).toBe(9);

    });

    it("casts data in nested object", function() {

      schema = new Schema();
      schema.column('data', { type: 'object' });
      schema.column('data.*', { type: 'object' });
      schema.column('data.*.count', { type: 'integer' });
      schema.column('data.*.value', { type: 'integer' });

      var document = new Document({ schema: schema });
      var data = {
        'test': { count: '09', value: 5 }
      };
      document.set('data', data);
      expect(document.get('data.test.count')).toBe(9);

    });

  });

  describe(".watch()", function() {

    it("watches a data", function(done) {

      var document = new Document({
        data: { 'a.nested.value': 'test' }
      });
      document.watch('a.nested.value', function(path) {
        expect(document.get('a.nested.value')).toBe('hello');
        done();
      });
      document.set('unwatched.value', 'test');
      document.set('a.nested.value', 'hello');

    });

    it("watches a data on unset", function(done) {

      var document = new Document({
        data: { 'a.nested.value': 'test' }
      });
      document.watch('a.nested.value', function(path) {
        expect(document.get('a.nested.value')).toBe(null);
        done();
      });
      document.unset('unwatched.value');
      document.unset('a.nested.value');

    });

    it("doesn't watch unwatched data", function(done) {

      var count = 0;
      var handler = function() {
        count++;
      };
      var document = new Document();
      document.watch('a', handler);

      document.set('b', 'test');

      setTimeout(function() {
        expect(count).toBe(0);
        done();
      }, 25);

    });

    it("watches the root instance when no path is defined", function(done) {

      var document = new Document();
      document.set('a.nested.value', 'hello');

      document.watch(function(path) {
        expect(path).toEqual(['a', 'nested', 'value']);
        done();
      });
      document.set('a.nested.value', 'test');

    });

    it("overwrite previously watches", function(done) {

      var count = 0;
      var handler = function() {
        count++;
      };
      var document = new Document();
      document.watch('a', handler);
      document.watch('a', handler);

      document.set('a', 'test');

      setTimeout(function() {
        expect(count).toBe(1);
        done();
      }, 25);

    });

  });

  describe(".unwatch()", function() {

    it("unwatches data", function(done) {

      var count = 0;
      var document = new Document();
      var handler = function() {
        count++;
      };
      document.watch('a', handler);

      document.watch('b', handler);
      document.unwatch('b', handler);

      document.set('a', 'test');
      document.set('b', 'hello');

      setTimeout(function() {
        expect(count).toBe(1);
        done();
      }, 25);

    });

    it("unwatches all data", function(done) {

      var count = 0;
      var document = new Document();
      var handler = function() {
        count++;
      };
      document.watch(handler);
      document.unwatch(handler);

      document.set('unwatched.value', 'test');
      document.set('a.nested.value', 'hello');

      setTimeout(function() {
        expect(count).toBe(0);
        done();
      }, 25);

    });

    it("bails out when unwatching unwatched data", function() {

      var document = new Document();
      expect(document.unwatch(function(){})).toBe(document);

      var document = new Document();
      document.watch('abc', function(){});
      expect(document.unwatch('abc', function(){})).toBe(document);

    });

  });

  describe(".has()", function() {

    it("returns `true` if a element has been setted", function() {

      var document = new Document();
      document.set('field1', 'foo');
      document.set('field2', null);

      expect(document.has('field1')).toBe(true);
      expect(document.has('field2')).toBe(true);

    });

    it("returns `true` if a element has been setted using a dotted notation", function() {

      var document = new Document();
      document.set('field1.field1', 'foo');
      document.set('field2.field2', null);

      expect(document.has('field1.field1')).toBe(true);
      expect(document.has('field2.field2')).toBe(true);

    });

    it("returns `true` if a array value has been setted using a dotted notation", function() {

      var document = new Document();
      document.set('field1.field2', ['a', 'b']);

      expect(document.has('field1.field2.0')).toBe(true);
      expect(document.has('field1.field2.1')).toBe(true);
      expect(document.has('field1.field2.2')).toBe(false);

    });

    it("returns false if a element doesn't exist", function() {

      var document = new Document();
      expect(document.has('undefined')).toBe(false);

    });

  });

  describe(".unset()", function() {

    it("unsets items", function() {

      var data = {
        id: 1,
        title: 'test record',
        body: 'test body',
        enabled: true
      };

      var document = new Document({ data: data });
      document.unset('body');
      document.unset('enabled');

      expect(document.data()).toEqual({
        id: 1,
        title: 'test record'
      });

    });

    it("unsets items using a dotted notation", function() {

      var document = new Document();
      document.set('field1.field1', 'foo');
      document.set('field2.field2', null);
      document.unset('field1.field1');
      document.unset('field2.field2');

      expect(document.has('field1.field1')).toBe(false);
      expect(document.has('field2.field2')).toBe(false);

    });

    it("triggers a modified event when removing an attribute", function(done) {

      var document = new Document();
      document.set('a.nested.value', 'hello');

      document.on('modified', function() {
        done();
      });
      document.unset('a.nested.value', 'hello');

    });

  });

  describe(".original()", function() {

    it("returns original data", function() {

      var document = new Document({
        data: {
          id: 1,
          title: 'Hello',
          body: 'World'
        }
      });

      document.set({
        id: 1,
        title: 'Good Bye',
        body: 'Folks'
      });

      expect(document.original('title')).toBe('Hello');
      expect(document.original('body')).toBe('World');

      expect(document.get('title')).toBe('Good Bye');
      expect(document.get('body')).toBe('Folks');

      expect(document.modified('title')).toBe(true);
      expect(document.modified('body')).toBe(true);

    });

    it("returns all original data with no parameter", function() {

      var document = new Document({
        data: {
          id: 1,
          title: 'Hello',
          body: 'World'
        }
      });

      document.set({
        id: 1,
        title: 'Good Bye',
        body: 'Folks'
      });

      expect(document.original()).toEqual({
        id: 1,
        title: 'Hello',
        body: 'World'
      });

    });

  });

  describe(".modified()", function() {

    it("returns a boolean indicating if a field has been modified", function() {

      var document = new Document({
        data: {
          title: 'original'
        }
      });

      expect(document.modified('title')).toBe(false);

      document.set('title', 'modified');
      expect(document.modified('title')).toBe(true);

    });

    it("returns `false` if a field has been updated with a same scalar value", function() {

      var document = new Document({
        data: {
          title: 'original'
        }
      });

      expect(document.modified('title')).toBe(false);

      document.set('title', 'original');
      expect(document.modified('title')).toBe(false);

    });

    it("returns `false` if a field has been updated with a similar object value", function() {

      var document = new Document({
        data: {
          'body': {}
        }
      });

      expect(document.modified('body')).toBe(false);

      document.set('body', document.get('body'));
      expect(document.modified('body')).toBe(false);

    });

    it("delegates the job for values which has a `modified()` method", function() {

      var childDocument = new Document({
        data: {
          field: 'value'
        }
      });

      var document = new Document({
        data: {
          child: childDocument
        }
      });

      expect(document.modified()).toBe(false);

      document.get('child').set('field', 'modified');
      expect(document.modified()).toBe(true);

    });

    it("returns `true` when an unexisting field has been added", function() {

      var document = new Document();

      document.set('modified', 'modified');

      expect(document.modified()).toBe(true);

    });

    it("returns `true` when a field is unsetted", function() {

      var document = new Document({
        data: {
          title: 'original'
        }
      });

      expect(document.modified('title')).toBe(false);

      document.unset('title');
      expect(document.modified('title')).toBe(true);

    });

    it("returns `true` when a field is setted to `null`", function() {

      var document = new Document({
        data: {
          title: 'original'
        }
      });

      expect(document.modified('title')).toBe(false);

      document.set('title', null);

      expect(document.get('title')).toBe(null);
      expect(document.modified('title')).toBe(true);

    });

    it("returns `false` when an unexisting field is checked", function() {

      var document = new Document();
      expect(document.modified('unexisting')).toBe(false);

    });

    it("returns the list of modified fields", function() {

      document = new Document();
      document.set('modified', 'modified');
      expect(document.modified({ return: true })).toEqual(['modified']);

    });

    it("ignores ignored fields", function() {

      document = new Document();
      document.set('modified', 'modified');
      expect(document.modified({ ignore: ['modified'] })).toBe(false);

    });

    it("returns `true` when embedded relations data are modified", function() {

      var schema = new Schema();
      schema.column('list',       { type: 'object', array: true });
      schema.column('list.value', { type: 'integer' });

      var document = new Document({
        schema: schema,
        data: { list: [{ value: 50 }] }
      });

      expect(document.modified()).toBe(false);

      document.set('list.0.value', 60);
      expect(document.modified()).toBe(true);

    });

  });

  describe(".to('array')", function() {

    it("exports into an array", function() {

      var data = {
        id: 1,
        title: 'test record'
      };

      var document = new Document({ data: data });
      expect(document.to('array')).toEqual(data);

    });

    it("exports nested relations", function() {

      var data = {
        name: 'amiga_1200.jpg',
        title: 'Amiga 1200',
        tags: [
          { name: 'tag1' }
        ]
      };

      var image = new Document({ data: data });
      expect(image.data()).toEqual(data);

    });

    context("with JSON formatter", function() {

      beforeEach(function() {

        this.schema = new Schema();

        this.schema.formatter('datasource', 'json', function(value, options) {
          if (value && value.data) {
            value = value.data();
          }
          return JSON.stringify(value);
        });

      });

      it("casts according JSON casting handlers", function() {

        this.schema.column('timeSheet', {
          type: 'object',
          default: '{"1":null,"2":null,"3":null,"4":null,"5":null,"6":null,"7":null}',
          format: 'json'
        });
        this.schema.column('timeSheet.*', { type: 'integer' });

        var document = new Document({schema: this.schema});
        document.set('timeSheet', '{"1":8,"2":8,"3":8,"4":8,"5":8,"6":8,"7":8}');
        expect(document.get('timeSheet').data()).toEqual({ '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8, '7': 8 });
        expect(document.to('datasource')).toEqual({ timeSheet: '{"1":8,"2":8,"3":8,"4":8,"5":8,"6":8,"7":8}' });
        expect(document.data()).toEqual({timeSheet: { '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8, '7': 8 } });

      });

      it("casts array according JSON casting handlers", function() {

        this.schema.column('weekend', { type: 'integer', array: true, format: 'json', default: '[6,7]' });

        var document = new Document({schema: this.schema});
        document.set('weekend', '[1,2]');
        expect(document.get('weekend')).toBeAnInstanceOf(Collection);
        expect(document.get('weekend').data()).toEqual([1, 2]);
        expect(document.to('datasource')).toEqual({ weekend: '[1,2]' });
        expect(document.data()).toEqual({ weekend: [1, 2] });

      });

      it("casts according some custom format", function() {

        this.schema.column('timeSheet', {
          type: 'object',
          default: '{"1":null,"2":null,"3":null,"4":null,"5":null,"6":null,"7":null}',
          format: 'json'
        });
        this.schema.column('timeSheet.*', { type: 'integer' });

        var document = new Document({schema: this.schema});
        expect(document.get('timeSheet.1')).toEqual(null);

      });

    });

  });

  describe(".amend()", function() {

    it("returns a boolean indicating if a field has been modified", function() {

      var document = new Document({
        data: {
          title: 'original'
        }
      });

      expect(document.modified('title')).toBe(false);

      document.set('title', 'modified');
      expect(document.modified('title')).toBe(true);

      document.amend();
      expect(document.modified('title')).toBe(false);
      expect(document.get('title')).toBe('modified');

    });

    it("amends passed data", function() {

      var schema = new Schema();
      schema.column('data', { type: 'object' });
      schema.column('data.*', { type: 'object' });
      schema.column('data.*.count', { type: 'integer' });
      schema.column('data.*.value', { type: 'integer' });

      var document = new Document({ schema: schema });
      document.set('data', {
        'test': { count: 5, value: 5 }
      });
      expect(document.get('data.test.count')).toBe(5);

      document.amend({
        data: {
          'test': {
            count: 10, value: 10
          }
        }
      });

      expect(document.get('data.test.count')).toBe(10);

    });

  });

  describe(".restore()", function() {

    it("restores a document to its original values", function() {

      var document = new Document({
        data: {
          title: 'original'
        }
      });

      expect(document.modified('title')).toBe(false);

      document.set('title', 'modified');
      expect(document.modified('title')).toBe(true);

      document.restore();
      expect(document.modified('title')).toBe(false);
      expect(document.get('title')).toBe('original');

    });

  });

});
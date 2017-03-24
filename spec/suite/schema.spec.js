var co = require('co');
var Through = require('../../src/collection/through');
var Schema = require('../../src/schema');
var Document = require('../../src/').Document;
var Model = require('../../src/').Model;

var Gallery = require('../fixture/model/gallery');
var Image = require('../fixture/model/image');
var ImageTag = require('../fixture/model/image-tag');
var Tag = require('../fixture/model/tag');

describe("Schema", function() {

  beforeEach(function() {
    this.schema = Image.definition();

    this.preferences = new Schema();
    this.preferences.column('preferences', { type: 'object', default: {} });
    this.preferences.column('preferences.blacklist', { type: 'object', default: {} });
    this.preferences.column('preferences.blacklist.projects', { type: 'id', array: true, 'default': [] });
    this.preferences.column('preferences.mail', { type: 'object', default: {} });
    this.preferences.column('preferences.mail.enabled', { type: 'boolean', 'default': true });
    this.preferences.column('preferences.mail.frequency', { type: 'integer', 'default': 24 });

  });

  afterEach(function() {
    Image.reset();
  })

  describe(".constructor()", function() {

    it("correctly sets config options", function() {

      var conventions = {};

      var schema = new Schema({
        source: 'image',
        class: Image,
        key: 'key',
        locked: false,
        columns: [{ id: 'serial' }, { age: 'integer' }],
        meta: { some: 'meta'},
        conventions: conventions
      });

      expect(schema.source()).toBe('image');
      expect(schema.reference()).toBe(Image);
      expect(schema.key()).toBe('key');
      expect(schema.locked()).toBe(false);
      expect(schema.fields()).toEqual(['id', 'age']);
      expect(schema.meta()).toEqual({ some: 'meta' });
      expect(schema.conventions()).toBe(conventions);

    });

  });

  describe(".source()", function() {

    it("gets/sets the source", function() {

      var schema = new Schema();

      expect(schema.source('source_name')).toBe(schema);
      expect(schema.source()).toBe('source_name');

    });

  });

  describe(".reference()", function() {

    it("gets/sets the conventions", function() {

      var schema = new Schema();

      expect(schema.reference(Image)).toBe(schema);
      expect(schema.reference()).toBe(Image);

    });

  });

  describe(".lock()/.locked()", function() {

    it("gets/sets the lock value", function() {

      var schema = new Schema();

      expect(schema.lock(false)).toBe(schema);
      expect(schema.locked()).toBe(false);

      expect(schema.lock()).toBe(schema);
      expect(schema.locked()).toBe(true);

      expect(schema.lock(true)).toBe(schema);
      expect(schema.locked()).toBe(true);

    });

  });

  describe(".meta()", function() {

    it("gets/sets the meta value", function() {

      var schema = new Schema();

      expect(schema.meta({ some: 'meta' })).toBe(schema);
      expect(schema.meta()).toEqual({ some: 'meta' });

    });

  });

  describe(".key()", function() {

    it("gets/sets the primary key value", function() {

      var schema = new Schema();

      expect(schema.key('_id')).toBe(schema);
      expect(schema.key()).toBe('_id');

    });

  });

  describe(".names()", function() {

    it("returns all column names", function() {

      expect(this.schema.names().sort()).toEqual(['gallery_id', 'id', 'name', 'score', 'title']);

    });

    it("returns all column names and nested ones", function() {

      expect(this.preferences.names().sort()).toEqual([
        'preferences',
        'preferences.blacklist',
        'preferences.blacklist.projects',
        'preferences.mail',
        'preferences.mail.enabled',
        'preferences.mail.frequency'
      ]);

    });

    it("filters out virtual fields", function() {

      this.schema.column('virtualField', { virtual: true });
      var fields = this.schema.names();
      expect(fields['virtualField']).toBe(undefined);

    });

  });

  describe(".fields()", function() {

    it("returns all fields", function() {

      expect(this.schema.fields().sort()).toEqual(['gallery_id', 'id', 'name', 'score', 'title']);

    });

    it("returns fields according the base path", function() {

      expect(this.preferences.fields()).toEqual(['preferences']);
      expect(this.preferences.fields('preferences').sort()).toEqual(['blacklist', 'mail']);
      expect(this.preferences.fields('preferences.mail').sort()).toEqual(['enabled', 'frequency']);

    });

    it("filters out virtual fields", function() {

      this.schema.column('virtualField', { virtual: true });
      var fields = this.schema.fields();
      expect(fields['virtualField']).toBe(undefined);

    });

  });

  describe(".columns()", function() {

    it("returns all fields", function() {

      expect(this.schema.columns()).toEqual([
        {
          id: {
            type: 'serial',
            array: false,
            null: false
          }
        },
        {
          name: {
            type: 'string',
            array: false,
            null: true
          }
        },
        {
          title: {
            type: 'string',
            length: 50,
            array: false,
            null: true
          }
        },
        {
          score: {
            array: false,
            null: true,
            type: 'float'
          }
        },
        {
          gallery_id: {
            type: 'id',
            array: false,
            null: true
          }
        }
      ]);

    });

  });

  describe(".defaults()", function() {

    it("returns defaults", function() {

      this.schema.column('name', { type: 'string', default: 'Enter The Name Here' });
      this.schema.column('title', { type: 'string', default: 'Enter The Title Here', length: 50 });

      expect(this.schema.defaults()).toEqual({
        name: 'Enter The Name Here',
        title: 'Enter The Title Here'
      });

    });

    it("correctly sets default values with stars", function() {

      var schema = new Schema();
      schema.column('data', { type: 'object', default: {} });
      schema.column('data.*', { type: 'object', default: {} });
      schema.column('data.*.checked', { type: 'boolean', default: true });
      schema.locked(true);

      var document = new Document({ schema: schema });

      expect(document.get('data.value1.checked')).toBe(true);

    });

  });

  describe(".type()", function() {

    it("returns a field type", function() {

      expect(this.schema.type('id')).toBe('serial');

    });

  });

  describe(".column()", function() {

    beforeEach(function() {
      this.schema = new Schema();
    });

    it("gets the type of a field", function() {

      var schema = Image.definition();

      expect(schema.column('id')).toEqual({
        type: 'serial',
        array: false,
        null: false
      });

      expect(schema.column('gallery_id')).toEqual({
        type: 'id',
        array: false,
        null: true
      });

      expect(schema.column('name')).toEqual({
        type: 'string',
        array: false,
        null: true
      });

      expect(schema.column('title')).toEqual({
        type: 'string',
        length: 50,
        array: false,
        null: true
      });

      expect(schema.column('score')).toEqual({
        type: 'float',
        array: false,
        null: true
      });

    });

    it("sets a field with a specific type", function() {

      this.schema.column('age', { type: 'integer' });
      expect(this.schema.column('age')).toEqual({
        type: 'integer',
        array: false,
        null: true
      });

    });

    it("sets a field with a specific type using the string syntax", function() {

      this.schema.column('age', 'integer');
      expect(this.schema.column('age')).toEqual({
        type: 'integer',
        array: false,
        null: true
      });

    });

    it("sets a field as an array", function() {

      this.schema.column('ids', { type: 'integer', array: true });
      expect(this.schema.column('ids')).toEqual({
        type: 'integer',
        array: true,
        null: true
      });

    });

    it("sets a field with custom options", function() {

      this.schema.column('name', { type: 'integer', length: 11, use: 'bigint' });
      expect(this.schema.column('name')).toEqual({
        type: 'integer',
        length: 11,
        use: 'bigint',
        array: false,
        null: true
      });

    });

    it("sets nested fields", function() {

      var document = this.preferences.cast(undefined, {});
      expect(document.data()).toEqual({
        preferences: {
          blacklist: {
            projects: []
          },
          mail: {
            enabled: true,
            frequency: 24
          }
        }
      });

      document.set('preferences.mail.enabled', 0);
      expect(document.get('preferences.mail.enabled')).toBe(false);

    });

    context("with a dynamic getter", function() {

      beforeEach(function() {

        this.schema = new Schema();
        this.schema.column('date', { type: 'string' });
        this.schema.column('time', { type: 'string' });
        this.schema.column('datetime', {
          type: 'datetime',
          getter: function(entity, data, name) {
            return entity.get('date') + ' ' + entity.get('time') + ' UTC';
          }
        });

      });

      it("builds the field", function() {

        var document = this.schema.cast(null, {
          date: '2015-05-20',
          time: '21:50:00'
        });
        expect(document.get('datetime').toISOString().substring(0, 19).replace('T', ' ')).toBe('2015-05-20 21:50:00');
        expect(document.has('datetime')).toBe(false);

      });

      it("rebuilds the field on changes", function() {

        var document = this.schema.cast(null, {
          date: '2015-05-20',
          time: '21:50:00'
        });
        expect(document.get('datetime').toISOString().substring(0, 19).replace('T', ' ')).toBe('2015-05-20 21:50:00');

        document.set('time', '22:15:00');
        expect(document.get('datetime').toISOString().substring(0, 19).replace('T', ' ')).toBe('2015-05-20 22:15:00');
        expect(document.has('datetime')).toBe(false);

      });

    });

    context("with a dynamic setter", function() {

      context("with a normal field", function() {

        beforeEach(function() {

          this.schema = new Schema();
          this.schema.column('date', { type: 'string' });
          this.schema.column('time', { type: 'string' });
          this.schema.column('datetime', {
            type: 'string',
            setter: function(entity, data, name) {
              var parts = data.split(' ');
              entity.set('date', parts[0]);
              entity.set('time', parts[1]);
              return data;
            }
          });

        });

        it("builds the field", function() {

          var document = this.schema.cast();
          document.set('datetime', '2015-05-20 21:50:00');
          expect(document.get('date')).toBe('2015-05-20');
          expect(document.get('time')).toBe('21:50:00');
          expect(document.get('datetime')).toBe('2015-05-20 21:50:00');

        });

        it("rebuilds the field on changes", function() {

          var document = this.schema.cast();
          document.set('datetime', '2015-05-20 21:50:00');
          expect(document.get('date')).toBe('2015-05-20');
          expect(document.get('time')).toBe('21:50:00');
          expect(document.get('datetime')).toBe('2015-05-20 21:50:00');

          document.set('datetime', '2015-05-20 22:15:00');
          expect(document.get('date')).toBe('2015-05-20');
          expect(document.get('time')).toBe('22:15:00');
          expect(document.get('datetime')).toBe('2015-05-20 22:15:00');

        });

      });

      context("with a dynamic getter and a dynamic setter", function() {

        beforeEach(function() {

          this.schema = new Schema();
          this.schema.column('hello', {
            type: 'string',
            getter: function(entity, data, name) {
              return 'world';
            },
            setter: function(entity, data, name) {
              return entity.set('amiga', 1200);
            }
          });

        });

        it("builds the field", function() {

          var document = this.schema.cast();
          expect(document.get('hello')).toBe('world');

        });

        it("doesn't call the setter", function() {

          var document = this.schema.cast();
          expect(document.get('hello')).toBe('world');
          expect(document.get('amiga')).toBe(null);

        });

      });

      context("with a virtual field", function() {

        beforeEach(function() {

          this.schema = new Schema();
          this.schema.column('date', { type: 'string' });
          this.schema.column('time', { type: 'string' });
          this.schema.column('datetime', {
            type: 'string',
            virtual: true,
            setter: function(entity, data, name) {
              var parts = data.split(' ');
              entity.set('date', parts[0]);
              entity.set('time', parts[1]);
              return data;
            }
          });

        });

        it("builds the field", function() {

          var document = this.schema.cast();
          document.set('datetime', '2015-05-20 21:50:00');
          expect(document.get('date')).toBe('2015-05-20');
          expect(document.get('time')).toBe('21:50:00');
          expect(document.has('datetime')).toBe(false);

        });

        it("rebuilds the field on changes", function() {

          var document = this.schema.cast();
          document.set('datetime', '2015-05-20 21:50:00');
          expect(document.get('date')).toBe('2015-05-20');
          expect(document.get('time')).toBe('21:50:00');
          expect(document.has('datetime')).toBe(false);

          document.set('datetime', '2015-05-20 22:15:00');
          expect(document.get('date')).toBe('2015-05-20');
          expect(document.get('time')).toBe('22:15:00');
          expect(document.has('datetime')).toBe(false);

        });

      });

    });

  });

  describe(".unset()", function() {

    it("unsets a field", function() {

      this.schema.unset('title');
      expect(this.schema.has('title')).toBe(false);

    });

  });

  describe(".has()", function() {

    it("checks if a schema contain a field name", function() {

      expect(this.schema.has('title')).toBe(true);
      this.schema.unset('title');
      expect(this.schema.has('title')).toBe(false);

    });

    it("checks if a schema contain a virtual field name", function() {

      this.schema.column('virtualField', { virtual: true });
      expect(this.schema.has('virtualField')).toBe(true);

    });

  });

  describe(".append()", function() {

    beforeEach(function() {
      this.schema = new Schema();
      this.schema.column('id', { type: 'serial' });
    });

    context("using an array", function() {

      it("adds some fields to a schema", function() {

        this.schema.locked(false);

        this.schema.append({
          name: { type: 'string' },
          title: { type: 'string' }
        });

        var fields = this.schema.fields();
        expect(fields).toEqual(['id', 'name', 'title']);

      });

    });

    context("using a schema instance", function() {

      it("adds some fields to a schema", function() {

        var extra = new Schema();
        extra.column('name', { type: 'string' });
        extra.column('title', { type: 'string' });

        this.schema.append(extra);

        var fields = this.schema.fields();
        expect(fields).toEqual(['id', 'name', 'title']);

      });

    });

  });

  describe(".virtuals()", function() {

    it("returns all virtual fields", function() {

      this.schema.column('virtualField1', { virtual: true });
      this.schema.column('virtualField2', { virtual: true });

      expect(this.schema.virtuals()).toEqual(['virtualField1', 'virtualField2']);

    });

 });

  describe(".bind()", function() {

    it("binds a relation", function() {

      expect(this.schema.hasRelation('parent')).toBe(false);

      this.schema.bind('parent', {
        relation: 'belongsTo',
        to: Image,
        keys: { image_id: 'id' }
      });

      expect(this.schema.hasRelation('parent')).toBe(true);

    });

  });

  describe(".unbind()", function() {

    it("unbinds a relation", function() {

      expect(this.schema.hasRelation('gallery')).toBe(true);

      this.schema.unbind('gallery');

      expect(this.schema.hasRelation('gallery')).toBe(false);

    });

  });

  describe(".relations", function() {

    it("returns all relation names", function() {

      var relations = this.schema.relations();
      relations.sort();

      expect(relations).toEqual(['gallery', 'images_tags', 'tags']);

    });

    it("includes embedded relations using `true` as first parameter", function() {

      class MyModel extends Model {}

      var schema = new Schema({ class: MyModel });
      schema.column('embedded', {
        type: 'object',
        class: MyModel
      });

      expect(schema.relations()).toEqual([]);
      expect(schema.relations(true)).toEqual(['embedded']);

    });

  });

  describe(".conventions()", function() {

    it("gets/sets the conventions", function() {

      var conventions = {};
      var schema = new Schema();

      expect(schema.conventions(conventions)).toBe(schema);
      expect(schema.conventions()).toBe(conventions);

    });

  });

  describe(".expand()", function() {

    it("expands schema paths", function() {

      expect(this.schema.expand(['gallery', 'tags'])).toEqual({
        gallery: null,
        tags: null,
        'images_tags.tag': null
      });

    });

    it("perserves values", function() {

      var actual = this.schema.expand({
        gallery: {
          conditions: {
            name: 'My Gallery'
          }
        },
        tags: {
          conditions: {
            name: 'landscape'
          }
        }
      });

      expect(actual).toEqual({
        gallery: {
          conditions: {
            name: 'My Gallery'
          }
        },
        tags: {
          conditions: {
            name: 'landscape'
          }
        },
        'images_tags.tag': {
          conditions: {
            name: 'landscape'
          }
        }
      });

    });

  });

  describe(".treeify()", function() {

    it("expands HasManyThrough relations", function() {

      expect(this.schema.treeify(['gallery', 'tags'])).toEqual({
        gallery: null,
        images_tags: {
          embed: {
            tag: null
          }
        },
        tags: null
      });

    });

    it("expands dotted relations", function() {

      expect(this.schema.treeify(['gallery', 'images_tags.tag'])).toEqual({
        gallery: null,
        images_tags: {
          embed: {
            tag: null
          }
        }
      });

    });

    it("expands dotted relations with conditions", function() {

      expect(this.schema.treeify({
        gallery: null,
        'images_tags.tag': { conditions: { name: 'computer' } }
      })).toEqual({
        gallery: null,
        images_tags: {
          embed: {
            tag: {
              "conditions": {
                "name": "computer"
              }
            }
          }
        }
      });

    });

    it("works in a indempotent way", function() {

      expect(this.schema.treeify({
        gallery: { conditions: { name: 'Foo' } },
        images_tags: {
          embed: ['tag']
        }
      })).toEqual({
        gallery: { conditions: { name: 'Foo' } },
        images_tags: {
          embed: ['tag']
        }
      });

    });

  });

  describe(".cast()", function() {

    beforeEach(function() {

      var handlers = {
        'string': function(value, options) {
          return String(value);
        },
        'integer': function(value, options) {
          return Number.parseInt(value);
        },
        'float': function(value, options) {
          return Number.parseFloat(value);
        },
        'decimal': function(value, options) {
          return Number.parseFloat(value);
        },
        'boolean': function(value, options) {
          return !!value;
        },
        'date': function(value, options) {
          return this.format('cast', 'datetime', value);
        },
        'datetime': function(value, options) {
          return new Date(value);
        },
        null: function(value, options = []) {
          return null;
        }
      };

      this.schema.formatter('cast', 'id',        handlers['integer']);
      this.schema.formatter('cast', 'serial',    handlers['integer']);
      this.schema.formatter('cast', 'integer',   handlers['integer']);
      this.schema.formatter('cast', 'float',     handlers['float']);
      this.schema.formatter('cast', 'decimal',   handlers['decimal']);
      this.schema.formatter('cast', 'date',      handlers['date']);
      this.schema.formatter('cast', 'datetime',  handlers['datetime']);
      this.schema.formatter('cast', 'boolean',   handlers['boolean']);
      this.schema.formatter('cast', null,        handlers[null]);
      this.schema.formatter('cast', 'string',    handlers['string']);
      this.schema.formatter('cast', '_default_', handlers['string']);

    });

    it("casts a nested entity data", function() {

      var image = this.schema.cast(undefined, {
        id: '1',
        gallery_id: '2',
        name: 'image.jpg',
        title: 'My Image',
        score: '8.9',
        tags: [
          {
            id: '1',
            name: 'landscape'
          },
          {
            id: '2',
            name: 'mountain'
          }
        ]
      }, { exists: false });

      expect(Number.isInteger(image.get('id'))).toBe(true);
      expect(Number.isInteger(image.get('gallery_id'))).toBe(true);
      expect(image.get('name')).toBe('image.jpg');
      expect(image.get('title')).toBe('My Image');
      expect(image.get('score')).toBe(8.9);
      expect(image.get('tags') instanceof Through).toBe(true);
      expect(image.get('tags').schema()).toBe(Tag.definition());
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });

    });

    it("casts arrays of integer", function() {

      var schema = new Schema();
      schema.column('list', { type: 'integer', array: true });

      var document = new Document({ schema: schema });
      document.set('list', [4, 5]);

      expect(document.get('list').count()).toBe(2);
      expect(document.get('list').data()).toEqual([4, 5]);

    });

    it("casts field name with stars", function() {

      var schema = new Schema();
      schema.column('data', { type: 'object' });
      schema.column('data.*', { type: 'object' });
      schema.column('data.*.checked', { type: 'boolean' });
      schema.column('data.*.test', { type: 'object' });
      schema.column('data.*.test.*', { type: 'object' });
      schema.column('data.*.test.*.nested', { type: 'object' });
      schema.column('data.*.test.*.nested.*', { type: 'boolean', array: true });
      schema.locked(true);

      var document = new Document({ schema: schema });

      document.set('data.value1.checked', true);
      document.set('data.value2.checked', 1);
      expect(document.get('data.value1.checked')).toBe(true);
      expect(document.get('data.value2.checked')).toBe(true);

      document.set('data.value3.checked', false);
      document.set('data.value4.checked', 0);
      document.set('data.value5.checked', '');
      expect(document.get('data.value3.checked')).toBe(false);
      expect(document.get('data.value4.checked')).toBe(false);
      expect(document.get('data.value5.checked')).toBe(false);

      document.set('data.value3.test.deeply.nested.false', [0, '', false]);
      document.set('data.value3.test.deeply.nested.true', [1, true]);
      expect(document.get('data.value3.test.deeply.nested.false').data()).toEqual([false, false, false]);
      expect(document.get('data.value3.test.deeply.nested.true').data()).toEqual([true, true]);

      expect(document.data()).toEqual({
        data: {
          value1: {
            checked: true
          },
          value2: {
            checked: true
          },
          value3: {
            checked: false,
            test: {
              deeply: {
                nested: {
                  false: [false, false, false],
                  true: [true, true]
                }
              }
            }
          },
          value4: {
            checked: false
          },
          value5: {
            checked: false
          }
        }
      });

    });

    it("doesn't cast undefined type", function() {

      var schema = new Schema();
      schema.column('key', { type: 'undefined' });

      var document = new Document({ schema: schema });

      document.set('key', 'test');
      expect(document.get('key')).toEqual('test');

      document.set('key', [4, 5]);
      expect(document.get('key')).toEqual([4, 5]);

      document.set('key', { a: 'b' });
      expect(document.get('key')).toEqual({ a: 'b' });

    });

    it("correctly sets base path with stars", function() {

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

      expect(document.get('data').basePath()).toBe('data');
      expect(document.get('data.value1').basePath()).toBe('data.*');
      expect(document.get('data.value3.test.deeply.nested').basePath()).toBe('data.*.test.*.nested');

    });

  });

  describe(".format()", function() {

    beforeEach(function() {
      this.schema = new Schema();
      this.schema.column('id',         { type: 'serial' });
      this.schema.column('name',       { type: 'string' });
      this.schema.column('null',       { type: 'string' });
      this.schema.column('value',      { type: 'integer' });
      this.schema.column('double',     { type: 'float' });
      this.schema.column('revenue',    {
          type: 'decimal',
          length: 20,
          precision: 2
        });
      this.schema.column('active',     { type: 'boolean' });
      this.schema.column('registered', { type: 'date' });
      this.schema.column('created',    { type: 'datetime' });
    });

    it("formats according default `'cast'` handlers", function() {

      expect(this.schema.format('cast', 'id', 123)).toBe(123);
      expect(this.schema.format('cast', 'value', 123)).toBe(123);
      expect(this.schema.format('cast', 'double', 12.3)).toBe(12.3);
      expect(this.schema.format('cast', 'revenue', 12.3)).toBe('12.30');
      var date = new Date('2014-11-21');
      expect(this.schema.format('cast', 'registered', date)).toEqual(date);
      expect(this.schema.format('cast', 'registered', '2014-11-21')).toEqual(date);
      var datetime = new Date('2014-11-21 10:20:45');
      expect(this.schema.format('cast', 'created', datetime)).toEqual(datetime);
      expect(this.schema.format('cast', 'created', '2014-11-21 10:20:45')).toEqual(datetime);
      expect(this.schema.format('cast', 'active', true)).toBe(true);
      expect(this.schema.format('cast', 'active', false)).toBe(false);
      expect(this.schema.format('cast', 'null', null)).toBe(null);
      expect(this.schema.format('cast', 'name', 'abc')).toBe('abc');
      expect(this.schema.format('cast', 'unexisting', 123)).toBe(123);

    });

    it("formats according default `'array'` handlers", function() {

      expect(this.schema.format('array', 'id', 123)).toBe(123);
      expect(this.schema.format('array', 'value', 123)).toBe(123);
      expect(this.schema.format('array', 'double', 12.3)).toBe(12.3);
      expect(this.schema.format('array', 'revenue', 12.3)).toBe('12.3');
      var date = new Date('2014-11-21');
      expect(this.schema.format('array', 'registered', date)).toBe('2014-11-21');
      expect(this.schema.format('array', 'registered', '2014-11-21')).toBe('2014-11-21');
      var datetime = new Date('2014-11-21 10:20:45');
      expect(this.schema.format('array', 'created', datetime)).toBe('2014-11-21 10:20:45');
      expect(this.schema.format('array', 'created', '2014-11-21 10:20:45')).toBe('2014-11-21 10:20:45');
      expect(this.schema.format('array', 'active', true)).toBe(true);
      expect(this.schema.format('array', 'active', false)).toBe(false);
      expect(this.schema.format('array', 'null', null)).toBe(null);
      expect(this.schema.format('array', 'name', 'abc')).toBe('abc');
      expect(this.schema.format('array', 'unexisting', 123)).toBe('123');

    });

  });

  describe(".hasRelation()", function() {

    it("checks if an embedded relation exists", function() {

      var schema = new Schema();
      schema.column('embedded', { type: 'object' });

      expect(schema.hasRelation('embedded')).toBe(true);
      expect(schema.hasRelation('embedded', true)).toBe(true);
      expect(schema.hasRelation('embedded', false)).toBe(false);

    });

    it("checks if an external relation exists", function() {

      var schema = new Schema();
      schema.bind('external', {
        relation: 'belongsTo',
        to: Image,
        keys: { image_id: 'id' }
      });

      expect(schema.hasRelation('external')).toBe(true);
      expect(schema.hasRelation('external', false)).toBe(true);
      expect(schema.hasRelation('external', true)).toBe(false);

    });

  });

});

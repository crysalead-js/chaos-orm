import { Through, Schema, Model } from '../../src';

import Gallery from '../fixture/model/gallery';
import Image from '../fixture/model/image';
import ImageTag from '../fixture/model/image-tag';
import Tag from '../fixture/model/tag';

describe("Schema", function() {

  beforeEach(function() {
    this.schema = Image.schema();
  });

  afterEach(function() {
    Image.reset();
  })

  describe(".constructor()", function() {

    it("correctly sets config options", function() {

      var connection = { formatters: function() { return []; }};
      var conventions = {};

      var schema = new Schema({
        connection: connection,
        source: 'image',
        model: Image,
        key: 'key',
        locked: false,
        fields: [{ id: 'serial' }, { age: 'integer' }],
        meta: { some: 'meta'},
        conventions: conventions
      });

      expect(schema.connection()).toBe(connection);
      expect(schema.source()).toBe('image');
      expect(schema.model()).toBe(Image);
      expect(schema.key()).toBe('key');
      expect(schema.locked()).toBe(false);
      expect(schema.fields()).toEqual([
        {
          id: {
            type: 'serial',
            array: false,
            null: false
          }
        },
        {
          age: {
            type: 'integer',
            array: false,
            null: true
          }
        }
      ]);
      expect(schema.meta()).toEqual({ some: 'meta' });
      expect(schema.conventions()).toBe(conventions);

    });

  });

  describe(".connection()", function() {

    it("gets/sets the connection", function() {

      var connection = {};
      var schema = new Schema();

      expect(schema.connection(connection)).toBe(schema);
      expect(schema.connection()).toBe(connection);

    });

  });

  describe(".source()", function() {

    it("gets/sets the source", function() {

      var schema = new Schema();

      expect(schema.source('source_name')).toBe(schema);
      expect(schema.source()).toBe('source_name');

    });

  });

  describe(".model()", function() {

    it("gets/sets the conventions", function() {

      var schema = new Schema();

      expect(schema.model(Image)).toBe(schema);
      expect(schema.model()).toBe(Image);

    });

  });

  describe(".locked()", function() {

    it("gets/sets the lock value", function() {

      var schema = new Schema();

      expect(schema.locked(false)).toBe(schema);
      expect(schema.locked()).toBe(false);

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

    it("gets the schema field names", function() {

      var names = this.schema.names();
      names.sort();
      expect(names).toEqual(['gallery_id', 'id', 'name', 'score', 'title']);

    });

  });

  describe(".fields()", function() {

    it("returns all fields", function() {

      expect(this.schema.fields()).toEqual([
        {
          id: {
            type: 'serial',
            array: false,
            null: false
          }
        },
        {
          gallery_id: {
            type: 'integer',
            array: false,
            null: true
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
        }
      ]);

    });

    it("returns an attribute only", function() {

      expect(this.schema.fields('default')).toEqual([
        { id: undefined },
        { gallery_id: undefined },
        { name: undefined },
        { title: undefined },
        { score: undefined }
      ]);

      expect(this.schema.fields('type')).toEqual([
        { id: 'serial' },
        { gallery_id: 'integer' },
        { name: 'string' },
        { title: 'string' },
        { score: 'float' }
      ]);

    });

  });

  it("returns defaults", function() {

    this.schema.set('name', { type: 'string', default: 'Enter The Name Here' });
    this.schema.set('title', { type: 'string', default: 'Enter The Title Here', length: 50 });

    expect(this.schema.defaults()).toEqual({
      name: 'Enter The Name Here',
      title: 'Enter The Title Here'
    });

  });

  describe(".type()", function() {

    it("gets the type of a field", function() {

      expect(this.schema.field('id')).toEqual({
        type: 'serial',
        array: false,
        null: false
      });

    });

  });

  describe(".field()", function() {

    it("returns a field", function() {

      expect(this.schema.type('id')).toBe('serial');

    });

  });

  describe(".set()", function() {

    beforeEach(function() {
      this.schema = new Schema();
    });

    it("sets a field with default values", function() {

      this.schema.set('name');
      expect(this.schema.field('name')).toEqual({
        type: 'string',
        array: false,
        null: true
      });

    });

    it("sets a field with a specific type", function() {

      this.schema.set('age', { type: 'integer' });
      expect(this.schema.field('age')).toEqual({
        type: 'integer',
        array: false,
        null: true
      });

    });

    it("sets a field with a specific type using the string syntax", function() {

      this.schema.set('age', 'integer');
      expect(this.schema.field('age')).toEqual({
        type: 'integer',
        array: false,
        null: true
      });

    });

    it("sets a field as an array", function() {

      this.schema.set('ids', { type: 'integer', array: true });
      expect(this.schema.field('ids')).toEqual({
        type: 'integer',
        array: true,
        null: true
      });

    });

    it("sets a field with custom options", function() {

      this.schema.set('name', { type: 'integer', length: 11, use: 'bigint' });
      expect(this.schema.field('name')).toEqual({
        type: 'integer',
        length: 11,
        use: 'bigint',
        array: false,
        null: true
      });

    });

    it("sets nested fields", function() {

      var schema = new Schema();
      schema.set('preferences', { type: 'object' });
      schema.set('preferences.blacklist', { type: 'object' });
      schema.set('preferences.blacklist.projects', { type: 'id', array: true, 'default': [] });
      schema.set('preferences.mail', { type: 'object' });
      schema.set('preferences.mail.enabled', { type: 'boolean', 'default': true });
      schema.set('preferences.mail.frequency', { type: 'integer', 'default': 24 });

      var document = schema.cast(undefined, {});
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

  });

  describe(".remove()", function() {

    it("removes a field", function() {

      this.schema.remove('title');
      expect(this.schema.has('title')).toBe(false);

    });

  });

  describe(".has()", function() {

    it("checks if a schema contain a field name", function() {

      expect(this.schema.has('title')).toBe(true);
      this.schema.remove('title');
      expect(this.schema.has('title')).toBe(false);

    });

  });

  describe(".append()", function() {

    beforeEach(function() {
      this.schema = new Schema();
      this.schema.set('id', { type: 'serial' });
    });

    context("using an array", function() {

      it("adds some fields to a schema", function() {

        this.schema.locked(false);

        this.schema.append({
          name: { type: 'string' },
          title: { type: 'string' }
        });

        var fields = this.schema.fields();

        expect(fields).toEqual([
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
              array: false,
              null: true
            }
          }
        ]);

      });

    });

    context("using a schema instance", function() {

      it("adds some fields to a schema", function() {

        var extra = new Schema();
        extra.set('name', { type: 'string' });
        extra.set('title', { type: 'string' });

        this.schema.append(extra);

        var fields = this.schema.fields();

        expect(fields).toEqual([
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
              array: false,
              null: true
            }
          }
        ]);

      });

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

      var schema = new Schema({ model: MyModel });
      schema.set('embedded', {
        type: 'object',
        model: MyModel
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

    it("treeify schema paths", function() {

      expect(this.schema.treeify(['gallery', 'tags'])).toEqual({
        gallery: null,
        images_tags: {
          tag: null
        },
        tags: null
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

      var image = this.schema.cast(null, {
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
      });

      expect(Number.isInteger(image.get('id'))).toBe(true);
      expect(Number.isInteger(image.get('gallery_id'))).toBe(true);
      expect(image.get('name')).toBe('image.jpg');
      expect(image.get('title')).toBe('My Image');
      expect(image.get('score')).toBe(8.9);
      expect(image.get('tags') instanceof Through).toBe(true);
      expect(image.get('tags').model()).toBe(Tag);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });

    });

  });
});

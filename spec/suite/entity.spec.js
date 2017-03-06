var co = require('co');
var Schema = require('../../src/schema');
var Document = require('../../src/').Document;
var Model = require('../../src/').Model;
var HasOne = require('../../src/relationship/has-one');
var Collection = require('../../src/collection/collection');
var Through = require('../../src/collection/through');

var Gallery = require('../fixture/model/gallery');
var GalleryDetail = require('../fixture/model/gallery-detail');
var Image = require('../fixture/model/image');
var ImageTag = require('../fixture/model/image-tag');
var Tag = require('../fixture/model/tag');

class MyModel extends Model {}

describe("Entity", function() {

  beforeEach(function() {
    var schema = MyModel.definition();
    schema.column('id', { type: 'serial' });
    schema.lock(false);
  });

  afterEach(function() {
    MyModel.reset();
  });

  describe(".constructor()", function() {

    it("loads the data", function() {

      var date = new Date('2014-10-26 00:25:15');

      var entity = MyModel.create({
        title: 'Hello',
        body: 'World',
        created: date
      });
      expect(entity.get('title')).toBe('Hello');
      expect(entity.get('body')).toBe('World');
      expect(entity.get('created')).toBe(date);

    });

    it("sets `exists` value to `null` for children", function() {

      var image = Image.create({
        id: 123,
        name: 'amiga_1200.jpg',
        title: 'Amiga 1200',
        gallery: { id: 456, name: 'MyGallery' }
      }, {
        exists: true
      });

      expect(image.exists()).toBe(true);

      var closure = function() {
        image.get('gallery').exists();
      };

      expect(closure).toThrow(new Error("No persitance information is available for this entity use `sync()` to get an accurate existence value."));

    });

    context("when unicity is enabled", function() {

      it("throws an exception when trying to make duplications", function() {

        MyModel.unicity(true);
        var data = { id: '1', title: 'Amiga 1200' };
        var entity = MyModel.create(data, { exists: true });

        var closure = function() {
          new MyModel({
            data: data,
            exists: true
          });
        };

        expect(closure).toThrow(new Error('Trying to create a duplicate of `my_model` ID `1` which is not allowed when unicity is enabled.'));

        MyModel.reset();

      });

    });

  });

  describe(".create()", function() {

    it("eagerly populates default values by default", function() {

      MyModel.definition().column('hello', { type: 'string', default: 'world' });
      var entity = MyModel.create();

      expect(entity.has('hello')).toBe(true);
      expect(entity.get('hello')).toBe('world');

    });

    it("lazily populates default values when the `'defaults'` option is set to false", function() {

      MyModel.definition().column('hello', { type: 'string', default: 'world' });
      var entity = MyModel.create({}, { defaults: false });

      expect(entity.has('hello')).toBe(false);
      expect(entity.get('hello')).toBe('world');

    });

  });

  describe(".self()", function() {

    it("returns the entity class", function() {

      var entity = MyModel.create();
      expect(entity.self()).toBe(MyModel);

    });

  });

  describe(".exists()", function() {

    it("returns the exists value", function() {

      var entity = MyModel.create({ id: 123 }, { exists: true });
      expect(entity.exists()).toBe(true);

    });

  });

  describe(".id()", function() {

    it("returns the entity's primary key value", function() {

      var entity = MyModel.create({
        id: 123,
        title: 'Hello',
        body: 'World'
      });
      expect(entity.id()).toBe(123);

    });

    it("throws an exception if the schema has no primary key defined", function() {

      var schema = new Schema({ key: null });
      schema.lock(false);
      MyModel.definition(schema);

      var closure = function() {
        var entity = MyModel.create({
          id: 123,
          title: 'Hello',
          body: 'World'
        });
        entity.id();
      };
      expect(closure).toThrow(new Error("No primary key has been defined for `MyModel`'s schema."));

    });

    it("throws an exception when trying to update an entity with no ID data", function() {

      var closure = function() {
        var entity = MyModel.create({}, { exists: true });
        entity.id();
      };
      expect(closure).toThrow(new Error("Existing entities must have a valid ID."));

    });

  });

  describe(".amend()", function() {

    it("amends an entity to its persisted value", function() {

      var entity = MyModel.create();
      entity.set('modified', 'modified');

      expect(entity.exists()).toBe(false);
      expect(entity.id()).toBe(null);
      expect(entity.modified('modified')).toBe(true);

      entity.amend({id: 123, added: 'added' }, { exists: true });

      expect(entity.exists()).toBe(true);
      expect(entity.id()).toBe(123);
      expect(entity.modified('modified')).toBe(false);
      expect(entity.modified('added')).toBe(false);
      expect(entity.get('added')).toBe('added');

    });

    it("amends all associated data", function() {

      var image = Image.create({
        name: 'amiga_1200.jpg',
        title: 'Amiga 1200'
      });

      expect(image.exists()).toBe(false);

      image.amend({
        id: 123,
        gallery: { id: 456, name: 'MyGallery' }
      }, { exists: 'all' });

      expect(image.id()).toBe(123);
      expect(image.exists()).toBe(true);
      expect(image.get('gallery').exists()).toBe(true);

    });

    context("when there's no primary key", function() {

      it("amends an entity to its persisted value", function() {

        var entity = MyModel.create();
        entity.set('modified', 'modified');

        expect(entity.exists()).toBe(false);
        expect(entity.id()).toBe(null);
        expect(entity.modified('modified')).toBe(true);

        entity.amend({ added: 'added' }, { exists: true });

        expect(entity.exists()).toBe(true);
        expect(entity.id()).toBe(null);
        expect(entity.modified('modified')).toBe(false);
        expect(entity.modified('added')).toBe(false);
        expect(entity.get('added')).toBe('added');

      });

    });

    context("when unicity is enabled", function() {

      it("stores the entity in the shard when the entity has been persisted", function() {

        MyModel.unicity(true);
        var shard = MyModel.shard();

        var data = { id: '1', title: 'Amiga 1200' };
        var entity = MyModel.create(data);

        expect(shard.has(entity.id())).toBe(false);

        entity.amend({ name: 'file.jpg' }, {exists: true});

        expect(shard.has(entity.id())).toBe(true);
        expect(shard.size).toBe(1);

        expect(entity.get('name')).toBe('file.jpg');

        MyModel.reset();

      });

      it("removes the entity from the shard when the entity has been deleted", function() {

        MyModel.unicity(true);
        var shard = MyModel.shard();

        var data = { id: '1', title: 'Amiga 1200' };
        var entity = MyModel.create(data, { exists: true });

        expect(shard.has(entity.id())).toBe(true);
        expect(shard.size).toBe(1);

        entity.amend({ name: 'file.jpg' }, { exists: false });

        expect(shard.has(entity.id())).toBe(false);

        expect(entity.get('name')).toBe('file.jpg');

        MyModel.reset();

      });

    });

  });

  describe(".get()/.set()", function() {

    afterEach(function() {
      Image.reset();
    });

    it("sets values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var entity = MyModel.create();
      expect(entity.set('title', 'Hello')).toBe(entity);
      expect(entity.set('body', 'World')).toBe(entity);
      expect(entity.set('created', date)).toBe(entity);

      expect(entity.get('title')).toBe('Hello');
      expect(entity.get('body')).toBe('World');
      expect(entity.get('created')).toBe(date);

    });

    it("sets an array of values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var entity = MyModel.create();
      expect(entity.set({
        title: 'Hello',
        body: 'World',
        created: date
      })).toBe(entity);
      expect(entity.get('title')).toBe('Hello');
      expect(entity.get('body')).toBe('World');
      expect(entity.get('created')).toBe(date);

    });

    it("sets nested arbitraty value in cascade when locked is `false`", function() {

      Image.definition().lock(false);

      var image = Image.create();
      image.set('a.nested.value', 'hello');

      expect(image.data()).toEqual({
        a: {
          nested: {
            value: 'hello'
          }
        }
      });

      expect(image).toBeAnInstanceOf(Image);
      expect(image.get('a')).toBeAnInstanceOf(Document);
      expect(image.get('a.nested')).toBeAnInstanceOf(Document);

    });

    it("sets a single belongsTo relation", function() {

      var image = Image.create();
      image.set('gallery', { id: '1', name: 'MyGallery' });

      expect(image.get('gallery_id')).toBe(1);
      expect(image.get('gallery') instanceof Gallery).toBe(true);
      expect(image.get('gallery').data()).toEqual({ id: 1, name: 'MyGallery' });

    });

    it("clears a single belongsTo relation when using a `null/undefined` value", function() {

      var image = Image.create();
      image.set('gallery', { id: '1', name: 'MyGallery' });
      image.set('gallery', null);
      expect(image.get('gallery_id')).toBe(null);
      expect(image.get('gallery')).toBe(null);


      image.set('gallery', { id: '1', name: 'MyGallery' });
      image.set('gallery', undefined);
      expect(image.get('gallery_id')).toBe(null);
      expect(image.get('gallery')).toBe(null);

    });

    it("sets a single hasMany relation", function() {

      var image = Image.create();
      image.set('images_tags.0', { id: '1', image_id: '1', tag_id: '1' });

      expect(image.get('images_tags') instanceof Collection).toBe(true);
      expect(image.get('images_tags.0') instanceof ImageTag).toBe(true);
      expect(image.get('images_tags.0').data()).toEqual({ id: 1, image_id: 1, tag_id: 1 });

    });

    it("clears a single hasMany relation when using a `null/undefined` value", function() {

      var image = Image.create();
      image.set('images_tags.0', { id: '1', image_id: '1', tag_id: '1' });
      image.set('images_tags', null);

      expect(image.get('images_tags') instanceof Collection).toBe(true);
      expect(image.get('images_tags').count()).toBe(0);

      var image = Image.create();
      image.set('images_tags.0', { id: '1', image_id: '1', tag_id: '1' });
      image.set('images_tags', undefined);

      expect(image.get('images_tags') instanceof Collection).toBe(true);
      expect(image.get('images_tags').count()).toBe(0);

    });

    it("sets a hasMany array", function() {

      var image = Image.create();
      image.set('images_tags', [
        {
          id: '1',
          image_id: '1',
          tag_id: '1'
        },
        {
          id: '2',
          image_id: '1',
          tag_id: '2'
        }
      ]);
      expect(image.get('images_tags') instanceof Collection).toBe(true);
      expect(image.get('images_tags.0').data()).toEqual({ id: 1, image_id: 1, tag_id: 1 });
      expect(image.get('images_tags.1').data()).toEqual({ id: 2, image_id: 1, tag_id: 2 });

    });

    it("sets a single hasManyThrough relation", function() {

      var image = Image.create();

      image.set('tags.0', { id: '1', name: 'landscape' });

      expect(image.get('tags') instanceof Through).toBe(true);
      expect(image.get('tags.0') instanceof Tag).toBe(true);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });

    });

    it("sets a hasManyThrough array", function() {

      var image = Image.create();
      image.set('tags', [
        {
          id: '1',
          name: 'landscape'
        },
        {
          id: '2',
          name: 'mountain'
        }
      ]);
      expect(image.get('tags') instanceof Through).toBe(true);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });

    });

    it("resets a hasManyThrough array using a plain array", function() {

      var image = Image.create();
      var tags = [
        {
          id: '1',
          name: 'landscape'
        },
        {
          id: '2',
          name: 'mountain'
        }
      ];
      image.set('tags', tags);
      expect(image.get('tags') instanceof Through).toBe(true);
      expect(image.get('tags').length).toBe(2);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });

      image.set('tags', tags);
      expect(image.get('tags').length).toBe(2);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });

    });

    it("resets a hasManyThrough array using a Through collection", function() {

      var image = Image.create();
      var tags = [
        {
          id: '1',
          name: 'landscape'
        },
        {
          id: '2',
          name: 'mountain'
        }
      ];
      image.set('tags', tags);
      expect(image.get('tags') instanceof Through).toBe(true);
      expect(image.get('tags').length).toBe(2);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });

      tags = image.get('tags');
      image.set('tags', tags);
      expect(image.get('tags').length).toBe(2);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });

    });

    it("keeps existing value on resets with hasManyThrough data", function() {

      var image = Image.create({
        id: 1,
        name: 'landscape',
        images_tags: [
          {
            id: '1',
            image_id: '1',
            tag_id: '1',
            tag: {
              id: '1',
              name: 'landscape'
            }
          },
          {
            id: '2',
            image_id: '1',
            tag_id: '2',
            tag: {
              id: '2',
              name: 'mountain'
            }
          }
        ]
      }, { exists: 'all' });

      expect(image.get('tags') instanceof Through).toBe(true);
      expect(image.get('tags').length).toBe(2);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.0').exists()).toBe(true);
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });
      expect(image.get('tags.1').exists()).toBe(true);

      image.set('tags', image.get('tags').get());
      expect(image.get('tags').length).toBe(2);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.0').exists()).toBe(true);
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });
      expect(image.get('tags.1').exists()).toBe(true);

    });

    it("gets the hasManyThrough array from hasMany/belongsTo data", function() {

      var image = Image.create({ id: 1 }, { exists: true });
      image.set('images_tags', [
        {
          id: '1',
          image_id: '1',
          tag_id: '1',
          tag: {
            id: '1',
            name: 'landscape'
          }
        },
        {
          id: '2',
          image_id: '1',
          tag_id: '2',
          tag: {
            id: '2',
            name: 'mountain'
          }
        }
      ]);
      expect(image.get('tags') instanceof Through).toBe(true);
      expect(image.get('tags.0').data()).toEqual({ id: 1, name: 'landscape' });
      expect(image.get('tags.1').data()).toEqual({ id: 2, name: 'mountain' });

    });

    it("throws an exception when trying to set nested arbitraty value in cascade when locked is `true`", function() {

      var closure = function() {
        var image = Image.create();
        image.set('a.nested.value', 'hello');
      };

      expect(closure).toThrow(new Error('Missing schema definition for field: `a`.'));

    });

    it("sets a value using a virtual field", function() {

      var schema = MyModel.definition();
      schema.column('hello_boy', {
        setter: function(entity, data, name) {
            return 'Hi ' + data;
        }
      });
      var entity = MyModel.create();

      entity.set('hello_boy', 'boy');
      expect(entity.get('hello_boy')).toBe('Hi boy');

    });

    it("gets a value using a virtual field", function() {

      var schema = MyModel.definition();
      schema.column('hello_boy', {
        getter: function(entity, data, name) {
            return 'Hi Boy!';
        }
      });
      var entity = MyModel.create();

      expect(entity.get('hello_boy')).toBe('Hi Boy!');

    });

    it("autoboxes object columns", function() {

      MyModel.definition().column('child', {
        type: 'object'
      });

      var entity = MyModel.create();

      entity.set('child', {
        id: 1,
        title: 'child record',
        enabled: true
      });

      var child = entity.get('child');
      expect(child.constructor === Document).toBe(true);
      expect(child.parents().get(entity)).toBe('child');
      expect(child.basePath()).toBe('child');

    });

    it("autoboxes object columns with a custom model name", function() {

      class MyModelChild extends MyModel {
        static _define(schema) {
          schema.lock(false);
        }
      };

      MyModel.definition().column('child', {
        type: 'object',
        class: MyModelChild
      });

      var entity = MyModel.create();

      entity.set('child', {
        id: 1,
        title: 'child record',
        enabled: true
      });

      var child = entity.get('child');
      expect(child.constructor === MyModelChild).toBe(true);
      expect(child.parents().get(entity)).toBe('child');
      expect(child.basePath()).toBe(undefined);

    });

    it("lazy applies object columns schema to support single table inheritance", function() {

      class MyModelChild extends MyModel {
        static _define(schema) {
          schema.column('id', { type: 'serial' });
        }
        static create(data, options) {
          options.class = Document;
          return super.create(data, options);
        }
      };

      MyModel.definition().column('child', {
        type: 'object',
        class: MyModelChild
      });

      var entity = MyModel.create();

      entity.set('child', {
        id: 1,
        title: 'child record'
      });

      var child = entity.get('child');
      expect(child.constructor === Document).toBe(true);
      expect(child.schema()).not.toBe(MyModelChild.definition());
      expect(child.parents().get(entity)).toBe('child');
      expect(child.basePath()).toBe('child');

    });

    it("casts object columns", function() {

      MyModel.definition().column('child', {
        type: 'object'
      });

      var entity = MyModel.create({ child: {} });

      var child = entity.get('child');
      expect(child.constructor === Document).toBe(true);
      expect(child.parents().get(entity)).toBe('child');
      expect(child.basePath()).toBe('child');

    });

  });

  describe(".modified()", function() {

    afterEach(function() {
      Image.reset();
    });

    it("checks nested arbitraty value modifications in cascade", function() {

      Image.definition().lock(false);

      var image = Image.create();
      image.set('a.nested.value', 'hello');
      image.amend();
      expect(image.modified()).toBe(false);

      image.set('a.nested.value', 'world');
      expect(image.modified()).toBe(true);

    });

    it("checks belongsTo relations modifications", function() {

      var image = Image.create();
      image.set('gallery', { id: '1', name: 'MyGallery' });
      image.amend();
      expect(image.modified()).toBe(false);
      expect(image.get('gallery').modified()).toBe(false);

      image.set('gallery', { id: '2', name: 'My New Gallery' });
      expect(image.modified()).toBe(true);

      image.set('gallery', null);
      expect(image.modified()).toBe(true);

    });

    it("checks hasMany relations modifications", function() {

      var image = Image.create();
      image.set('images_tags.0', { id: '1', image_id: '1', tag_id: '1' });
      image.amend();
      expect(image.modified()).toBe(false);

      image.set('images_tags.1', { id: '2', image_id: '2', tag_id: '2' });
      expect(image.modified()).toBe(false);
      expect(image.modified({ embed: 'images_tags' })).toBe(true);
      expect(image.modified({ embed: 'tags' })).toBe(true);

      image.set('images_tags', undefined);
      expect(image.modified()).toBe(false);
      expect(image.modified({ embed: 'images_tags' })).toBe(true);
      expect(image.modified({ embed: 'tags' })).toBe(true);

    });

    it("sets a single hasManyThrough relation", function() {

      var image = Image.create();
      image.set('tags.0', { id: '1', name: 'landscape' });
      image.amend();
      expect(image.modified()).toBe(false);

      image.set('tags.1', { id: '2', name: 'galaxy' });
      expect(image.modified()).toBe(false);
      expect(image.modified({ embed: 'tags' })).toBe(true);

    });

  });

  describe(".validates()", function() {

    beforeEach(function() {
      Gallery.validator().rule('name', 'not:empty');

      Image.validator().rule('name', 'not:empty');

      Tag.validator().rule('name', 'not:empty');
    });

    afterEach(function() {
      Gallery.reset();
      Image.reset();
      Tag.reset();
    });

    it("validates an entity", function(done) {

      co(function*() {
        var gallery = Gallery.create();
        expect(yield gallery.validates()).toBe(false);
        expect(gallery.errors()).toEqual({ name: ['is required'] });

        gallery.set('name', '');
        expect(yield gallery.validates()).toBe(false);
        expect(gallery.errors()).toEqual({ name: ['must not be a empty'] });

        gallery.set('name', 'new gallery');
        expect(yield gallery.validates()).toBe(true);
        expect(gallery.errors()).toEqual({});
        done();
      });

    });

    it("validates a belongsTo nested entity", function(done) {

      co(function*() {
        var image = Image.create();
        image.set('gallery', Gallery.create());
        expect(yield image.validates()).toBe(false);
        expect(image.errors()).toEqual({
            name: ['is required'],
            gallery: {
              name: ['is required']
            }
        });

        image.set('name', 'new image');
        expect(yield image.validates()).toBe(false);
        expect(image.errors()).toEqual({
            gallery: {
              name: ['is required']
            }
        });

        image.set('gallery.name', 'new gallery');
        expect(yield image.validates()).toBe(true);
        expect(image.errors()).toEqual({});
        done();
      });

    });

    it("validates a hasMany nested entities", function(done) {

      co(function*() {
        var gallery = Gallery.create();
        gallery.get('images').push(Image.create());
        gallery.get('images').push(Image.create());

        expect(yield gallery.validates()).toBe(false);
        expect(gallery.errors()).toEqual({
          name: ['is required'],
          images: [
            { name: ['is required'] },
            { name: ['is required'] }
          ]
        });

        gallery.set('name', '');
        gallery.get('images.0').set('name', '');
        gallery.get('images.1').set('name', '');
        expect(yield gallery.validates()).toBe(false);
        expect(gallery.errors()).toEqual({
          name: ['must not be a empty'],
          images: [
            { name: ['must not be a empty'] },
            { name: ['must not be a empty'] }
          ]
        });

        gallery.set('name', 'new gallery');
        gallery.get('images.0').set('name', 'image1');
        gallery.get('images.1').set('name', '');
        expect(yield gallery.validates()).toBe(false);
        expect(gallery.errors()).toEqual({
            images: [
              {},
              { name: ['must not be a empty'] }
            ]
        });

        gallery.set('name', 'new gallery');
        gallery.get('images.0').set('name', 'image1');
        gallery.get('images.1').set('name', 'image2');
        expect(yield gallery.validates()).toBe(true);
        expect(gallery.errors()).toEqual({});
        done();
      });

    });

    it("validates a hasManyThrough nested entities", function(done) {

      co(function*() {
        var image = Image.create();
        image.get('tags').push(Tag.create());
        image.get('tags').push(Tag.create());

        expect(yield image.validates()).toBe(false);
        expect(image.errors()).toEqual({
          name: ['is required'],
          images_tags: [
            { tag: { name: ['is required'] } },
            { tag: { name: ['is required'] } }
          ],
          tags: [
            { name: ['is required'] },
            { name: ['is required'] }
          ]
        });

        image.set('name', '');
        image.get('tags.0').set('name', '');
        image.get('tags.1').set('name', '');
        expect(yield image.validates()).toBe(false);
        expect(image.errors()).toEqual({
          name: ['must not be a empty'],
          images_tags: [
            { tag: { name: ['must not be a empty'] } },
            { tag: { name: ['must not be a empty'] } }
          ],
          tags: [
            { name: ['must not be a empty'] },
            { name: ['must not be a empty'] }
          ]
        });

        image.set('name', 'new gallery');
        image.get('tags.0').set('name', 'image1');
        image.get('tags.1').set('name', '');
        expect(yield image.validates()).toBe(false);
        expect(image.errors()).toEqual({
            images_tags: [
               {},
               { tag: { name: ['must not be a empty'] } }
            ],
            tags: [
              {},
              { name: ['must not be a empty'] }
            ]
        });

        image.set('name', 'new gallery');
        image.get('tags.0').set('name', 'image1');
        image.get('tags.1').set('name', 'image2');
        expect(yield image.validates()).toBe(true);
        expect(image.errors()).toEqual({});
        done();
      });

    });

    it("passes entity instances to validator handlers", function(done) {

      co(function*() {

        var actual;

        var validator = Gallery.validator();

        validator.set('customValidationRule', function(value, options, params) {
          actual = options;
          return false;
        });

        validator.rule('name', ['customValidationRule']);

        var gallery = Gallery.create({ name: 'test' });
        expect(yield gallery.validates()).toBe(false);
        expect(actual.entity).toBe(gallery);
        done();
      });

    });

  });

  describe(".invalidate()", function() {

    it("invalidates an field", function() {

      var image = Image.create();

      expect(image.errored()).toBe(false);
      expect(image.errored('name')).toBe(false);

      expect(image.invalidate('name', 'is required')).toBe(image);

      expect(image.errored()).toBe(true);
      expect(image.errored('name')).toBe(true);
      expect(image.error('name')).toBe('is required');
      expect(image.errors()).toEqual({
        name: ['is required']
      });

    });

    it("invalidates multiple fields", function() {

      var image = Image.create();

      expect(image.errored()).toBe(false);
      expect(image.errored('title')).toBe(false);

      expect(image.invalidate({
        name: 'is required',
        title: ['error1', 'error2']
      })).toEqual(image);

      expect(image.errored()).toBe(true);
      expect(image.errored('title')).toBe(true);
      expect(image.error('title')).toBe('error1');
      expect(image.errors()).toEqual({
        name: ['is required'],
        title: ['error1', 'error2']
      });

    });

    it("triggers modified event on invalidation", function(done) {

      var image = Image.create();
      image.on('modified', function(path) {
        expect(path).toEqual([]);
        done();
      });
      expect(image.invalidate('name', 'is required')).toBe(image);

    });

  });

  describe(".save()", function() {

    afterEach(function() {
      Image.reset();
      Gallery.reset();
    })

    it("validates by default", function(done) {

      co(function*() {
        var image = Image.create();
        Image.validator().rule('name', 'not:empty');

        expect(yield image.save()).toBe(false);
        expect(image.exists()).toBe(false);
        done();
      }.bind(this));

    });

    it("doesn't validates direct relationships by default", function(done) {

      co(function*() {
        Gallery.validator().rule('name', 'not:empty');

        var image = Image.create({
          name: 'amiga_1200.jpg',
          title: 'Amiga 1200',
          gallery: {}
        });

        var schema = image.schema();

        var spy = spyOn(schema, 'save').and.callThrough();
        spyOn(schema, 'bulkInsert').and.returnValue(Promise.resolve(true));
        spyOn(schema, 'bulkUpdate').and.returnValue(Promise.resolve(true));

        expect(yield image.save()).toBe(true);
        expect(spy).toHaveBeenCalledWith(image, {
          validate: true,
          embed: false
        });
        done();
      }.bind(this));

    });

    it("validates embedded relationships", function(done) {

      co(function*() {
        Gallery.validator().rule('name', 'not:empty');

        var image = Image.create({
          name: 'amiga_1200.jpg',
          title: 'Amiga 1200',
          gallery: {}
        });

        expect(yield image.save({ embed: 'gallery' })).toBe(false);
        done();
      }.bind(this));

    });

  });

  describe(".hierarchy()", function() {

    it("returns all included relations and sub-relations with non empty data", function() {

      var gallery = Gallery.create({ name: 'Gallery1' });

      gallery.set('detail', { description: 'Tech' });

      var image = Image.create({
          title: 'Amiga 1200'
      });

      image.get('tags').push({ name: 'Computer' });
      image.get('tags').push({ name: 'Science' });

      image.set('gallery', gallery);

      gallery.get('images').push(image);

      expect(gallery.hierarchy()).toEqual([
          'detail',
          'images_tags.tag',
          'images.tags'
      ]);

    });

  });

  describe(".to('array')", function() {

    it("exports data using `'array'` formatter handlers", function() {

      var schema = MyModel.definition();
      schema.column('created', { type: 'date' });

      var entity = MyModel.create({
        title: 'Hello',
        body: 'World',
        created: new Date('2014-10-26 00:25:15')
      });

      expect(entity.data()).toEqual({
        title: 'Hello',
        body: 'World',
        created: '2014-10-26'
      });

    });

    it("supports recursive structures", function() {

      var data = {
        name: 'amiga_1200.jpg',
        title: 'Amiga 1200',
        tags: [
          { name: 'tag1' }
        ]
      };

      var image = Image.create(data);

      image.get('tags').forEach(function(tag) {
        tag.get('images').push(image);
      });

      expect(image.data()).toEqual({
        name: 'amiga_1200.jpg',
        title: 'Amiga 1200',
        images_tags: [
          { tag_id: null, tag: { name: 'tag1' } }
        ],
        tags: [
          { name: 'tag1' }
        ]
      });

    });

    it("supports the `'embed'` option", function() {

      var image = Image.create({
        title: 'Amiga 1200'
      });
      image.get('tags').push({ name: 'Computer' });
      image.get('tags').push({ name: 'Science' });

      image.set('gallery', { name: 'Gallery 1' });

      expect(image.to('array')).toEqual({
        title: 'Amiga 1200',
        tags: [
          { name: 'Computer' },
          { name: 'Science' }
        ],
        images_tags: [
          { tag_id: null, tag: { name: 'Computer' } },
          { tag_id: null, tag: { name: 'Science' } }
        ],
        gallery_id: null,
        gallery: { name: 'Gallery 1' }
      });

      expect(image.to('array', { embed: ['gallery'] })).toEqual({
        title: 'Amiga 1200',
        gallery_id: null,
        gallery: { name: 'Gallery 1' }
      });

      expect(image.to('array', { embed: false })).toEqual({
        title: 'Amiga 1200',
        gallery_id: null
      });

    });

  });

  describe(".toString()", function() {

    it("returns the title field", function() {

      var data = {
        id: 1,
        title: 'test record'
      };

      var entity = MyModel.create(data);
      expect(entity.toString()).toBe('test record');

    });

  });

});
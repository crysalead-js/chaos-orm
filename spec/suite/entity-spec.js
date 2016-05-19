import co from 'co';
import { Schema, Model, HasOne, Collection, Through } from '../../src';

import Gallery from '../fixture/model/gallery';
import GalleryDetail from '../fixture/model/gallery-detail';
import Image from '../fixture/model/image';
import ImageTag from '../fixture/model/image-tag';
import Tag from '../fixture/model/tag';

class MyModel extends Model {}

describe("Entity", function() {

  beforeEach(function() {
    var schema = MyModel.schema();
    schema.set('id', { type: 'serial' });
    schema.locked(false);
  });

  afterEach(function() {
    MyModel.reset();
  });

  describe(".constructor()", function() {

    it("loads the data", function() {

      var date = new Date('2014-10-26 00:25:15');

      var entity = new MyModel({ data: {
        title: 'Hello',
        body: 'World',
        created: date
      }});
      expect(entity.get('title')).toBe('Hello');
      expect(entity.get('body')).toBe('World');
      expect(entity.get('created')).toBe(date);

    });

  });

  describe(".model()", function() {

    it("returns the model class name", function() {

      var entity = new MyModel();
      expect(entity.model()).toBe(MyModel);

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
      schema.locked(false);
      MyModel.config({ schema: schema });

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

  });

  describe(".sync()", function() {

    it("syncs an entity to its persisted value", function() {

      var entity = new MyModel();
      entity.set('modified', 'modified');

      expect(entity.exists()).toBe(false);
      expect(entity.id()).toBe(undefined);
      expect(entity.modified('modified')).toBe(true);

      entity.sync(123, { added: 'added' }, { exists: true });

      expect(entity.exists()).toBe(true);
      expect(entity.id()).toBe(123);
      expect(entity.modified('modified')).toBe(false);
      expect(entity.modified('added')).toBe(false);
      expect(entity.get('added')).toBe('added');

    });

    context("when there's no primary key", function() {

      it("syncs an entity to its persisted value", function() {

        var entity = new MyModel();
        entity.set('modified', 'modified');

        expect(entity.exists()).toBe(false);
        expect(entity.id()).toBe(undefined);
        expect(entity.modified('modified')).toBe(true);

        entity.sync(undefined, { added: 'added' }, { exists: true });

        expect(entity.exists()).toBe(true);
        expect(entity.id()).toBe(undefined);
        expect(entity.modified('modified')).toBe(false);
        expect(entity.modified('added')).toBe(false);
        expect(entity.get('added')).toBe('added');

      });

    });

  });

  describe(".get()/.set()", function() {

    afterEach(function() {
      Image.reset();
    });

    it("sets values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var entity = new MyModel();
      expect(entity.set('title', 'Hello')).toBe(entity);
      expect(entity.set('body', 'World')).toBe(entity);
      expect(entity.set('created', date)).toBe(entity);

      expect(entity.get('title')).toBe('Hello');
      expect(entity.get('body')).toBe('World');
      expect(entity.get('created')).toBe(date);

    });

    it("sets an array of values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var entity = new MyModel();
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

      Image.schema().locked(false);

      var image = Image.create();
      image.set('a.nested.value', 'hello');

      expect(image.data()).toEqual({
        a: {
          nested: {
            value: 'hello'
          }
        }
      });

    });

    it("sets a single belongsTo relation", function() {

      var image = Image.create();
      image.set('gallery', { id: '1', name: 'MyGallery' });

      expect(image.get('gallery') instanceof Gallery).toBe(true);
      expect(image.get('gallery').data()).toEqual({ id: 1, name: 'MyGallery' });

    });

    it("sets a single hasMany relation", function() {

      var image = Image.create();
      image.set('images_tags.0', { id: '1', image_id: '1', tag_id: '1' });

      expect(image.get('images_tags') instanceof Collection).toBe(true);
      expect(image.get('images_tags.0') instanceof ImageTag).toBe(true);
      expect(image.get('images_tags.0').data()).toEqual({ id: 1, image_id: 1, tag_id: 1 });

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

    it("throws an exception when trying to set nested arbitraty value in cascade when locked is `true`", function() {

      var closure = function() {
        var image = Image.create();
        image.set('a.nested.value', 'hello');
      };

      expect(closure).toThrow(new Error('Missing schema definition for field: `a`.'));

    });

    it("sets a value using a dedicated method", function() {

      var entity = new MyModel();

      entity.setHelloBoy = function(data) {
        return 'Hi ' + data;
      };

      entity.set('hello_boy', 'boy');
      expect(entity.get('hello_boy')).toBe('Hi boy');

    });

    it("gets a value using a dedicated method", function() {

      var entity = new MyModel();
      entity.getHelloBoy = function(data) {
        return 'Hi ' + data;
      };

      entity.set('hello_boy', 'boy');
      expect(entity.get('hello_boy')).toBe('Hi boy');

    });

    context("when a model is defined", function() {

      it("autoboxes setted data", function() {

        class MyModelChild extends MyModel {
          static _define(schema) {
            schema.locked(false);
          }
        };

        MyModel.schema().set('child', {
          type: 'object',
          model: MyModelChild
        });

        var entity = new MyModel();

        entity.set('child', {
          id: 1,
          title: 'child record',
          enabled: true
        });

        var child = entity.get('child');
        expect(child instanceof MyModelChild).toBe(true);
        expect(child.parent()).toBe(entity);
        expect(child.rootPath()).toBe(undefined);

      });

    });

  });

  describe(".validate()", function() {

    beforeEach(function() {
      var validator = Gallery.validator();
      validator.rule('name', 'not:empty');

      var validator = Image.validator();
      validator.rule('name', 'not:empty');
    });

    afterEach(function() {
      Gallery.reset();
      Image.reset();
    });

    it("validate an entity", function(done) {

      co(function*() {
        var gallery = Gallery.create();
        expect(yield gallery.validate()).toBe(false);
        expect(gallery.errors()).toEqual({ name: ['is required'] });

        gallery.set('name', '');
        expect(yield gallery.validate()).toBe(false);
        expect(gallery.errors()).toEqual({ name: ['must not be a empty'] });

        gallery.set('name', 'new gallery');
        expect(yield gallery.validate()).toBe(true);
        expect(gallery.errors()).toEqual({});
        done();
      });

    });

    it("validate an nested entities", function(done) {

      co(function*() {
        var gallery = Gallery.create();
        gallery.get('images').push(Image.create());
        gallery.get('images').push(Image.create());

        expect(yield gallery.validate()).toBe(false);
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
        expect(yield gallery.validate()).toBe(false);
        expect(gallery.errors()).toEqual({
          name: ['must not be a empty'],
          images: [
            { name: ['must not be a empty'] },
            { name: ['must not be a empty'] }
          ]
        });

        gallery.set('name', 'new gallery');
        gallery.get('images.0').set('name', 'image1');
        gallery.get('images.1').set('name', 'image2');
        expect(yield gallery.validate()).toBe(true);
        expect(gallery.errors()).toEqual({
            images: [
              {},
              {}
            ]
        });
        done();
      });

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

    it("validates direct relationships by default", function(done) {

      co(function*() {
        Gallery.validator().rule('name', 'not:empty');

        var image = Image.create({
          name: 'amiga_1200.jpg',
          title: 'Amiga 1200',
          gallery: {}
        });
        expect(yield image.save()).toBe(false);
        expect(image.exists()).toBe(false);
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

      var schema = MyModel.schema();
      schema.set('created', { type: 'date' });

      var entity = new MyModel({ data: {
        title: 'Hello',
        body: 'World',
        created: new Date('2014-10-26 00:25:15')
      }});

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
          { tag: { name: 'tag1' } }
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
          { tag: { name: 'Computer' } },
          { tag: { name: 'Science' } }
        ],
        gallery: { name: 'Gallery 1' }
      });

      expect(image.to('array', { embed: ['gallery'] })).toEqual({
        title: 'Amiga 1200',
        gallery: { name: 'Gallery 1' }
      });

      expect(image.to('array', { embed: false })).toEqual({
        title: 'Amiga 1200'
      });

    });

  });

});
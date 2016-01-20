import co from 'co';
import { Schema, Model, HasOne } from '../../src';

import Gallery from '../fixture/model/gallery';
import Image from '../fixture/model/image';

class MyModel extends Model {}

describe("Entity", function() {

  beforeEach(function() {
    var schema = MyModel.schema();
    schema.set('id', { type: 'serial' });
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

  describe(".exists()", function() {

    it("returns the exists value", function() {

      var entity = MyModel.create({}, { exists: true });
      expect(entity.exists()).toBe(true);

    });

  });

  describe(".parent()", function() {

    it("sets a parent", function() {

      var parent = {};
      var entity = new MyModel();
      entity.parent(parent);
      expect(entity.parent()).toBe(parent);

    });

    it("returns the parent", function() {

      var parent = {};
      var entity = MyModel.create([], { parent: parent });
      expect(entity.parent()).toBe(parent);

    });

  });

  describe(".rootPath()", function() {

    it("returns the root path", function() {

      var entity = MyModel.create([], { rootPath: 'items' });
      expect(entity.rootPath()).toBe('items');

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

    it("returns `null` for undefined fields", function() {

      var entity = new MyModel();
      expect(entity.get('foo')).toBe(undefined);

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

    it("sets a value using a dedicated method", function() {

      var entity = new MyModel();

      entity.setHelloBoy = function(data) {
        return 'Hi ' + data;
      };

      entity.set('hello_boy', 'boy');
      expect(entity.get('hello_boy')).toBe('Hi boy');

    });

    it("returns all raw datas with no parameter", function() {

      var timestamp = 1446208769;

      var entity = MyModel.create({
        title: 'Hello',
        body: 'World',
        created: timestamp
      });
      expect(entity.get()).toEqual({
        title: 'Hello',
        body: 'World',
        created: timestamp
      });

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

        class MyModelChild extends MyModel {};

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
        expect(child.rootPath()).toBe('child');

      });

    });

    it("throws an exception if the field name is not valid", function() {

       var closure = function() {
        var entity = new MyModel();
        entity.get('');
      };
      expect(closure).toThrow(new Error("Field name can't be empty."));

    });

  });

  describe(".persisted()", function() {

    it("returns persisted data", function() {

      var entity = MyModel.create({
        id: 1,
        title: 'Hello',
        body: 'World'
      }, { exists: true });

      entity.set({
        id: 1,
        title: 'Good Bye',
        body: 'Folks'
      });

      expect(entity.persisted('title')).toBe('Hello');
      expect(entity.persisted('body')).toBe('World');

      expect(entity.get('title')).toBe('Good Bye');
      expect(entity.get('body')).toBe('Folks');

      expect(entity.modified('title')).toBe(true);
      expect(entity.modified('body')).toBe(true);

    });

    it("returns all persisted data with no parameter", function() {

      var entity = MyModel.create({
        id: 1,
        title: 'Hello',
        body: 'World'
      }, { exists: true });

      entity.set({
        id: 1,
        title: 'Good Bye',
        body: 'Folks'
      });

      expect(entity.persisted()).toEqual({
        id: 1,
        title: 'Hello',
        body: 'World'
      });

    });

  });

  describe(".modified()", function() {

    it("returns a boolean indicating if a field has been modified", function() {

      var entity = MyModel.create({ title: 'original' }, { exists: true });

      expect(entity.modified('title')).toBe(false);

      entity.set('title', 'modified');
      expect(entity.modified('title')).toBe(true);

    });

    it("returns `false` if a field has been updated with a same scalar value", function() {

      var entity = MyModel.create({ title: 'original' }, { exists: true });

      expect(entity.modified('title')).toBe(false);

      entity.set('title', 'original');
      expect(entity.modified('title')).toBe(false);

    });

    it("returns `false` if a field has been updated with a similar object value", function() {

      var entity = MyModel.create({ 'body': {} }, { exists: true });

      expect(entity.modified('body')).toBe(false);

      entity.set('title', {});
      expect(entity.modified('body')).toBe(false);

    });

    it("delegates the job for values which has a `modified()` method", function() {

      class MyModelChild extends MyModel {};

      MyModel.schema().set('child', {
        type: 'object',
        to: MyModelChild
      });

      var childEntity = MyModelChild.create({ field: 'value' }, { exists: true });

      var entity = MyModel.create({ child: childEntity }, { exists: true });

      expect(entity.modified()).toBe(false);

      entity.get('child').set('field', 'modified');
      expect(entity.modified()).toBe(true);

    });

    it("returns `true` when an unexisting field has been added", function() {

      var entity = MyModel.create([], { exists: true });

      entity.set('modified', 'modified');

      expect(entity.modified()).toBe(true);

    });

    it("returns `true` when a field is removed", function() {

      var entity = MyModel.create({ title: 'original' }, { exists: true });

      expect(entity.modified('title')).toBe(false);

      entity.unset('title');
      expect(entity.modified('title')).toBe(true);

    });

    it("returns `false` when an unexisting field is checked", function() {

      var entity = MyModel.create([], { exists: true });
      expect(entity.modified('unexisting')).toBe(false);

    });

  });

  describe(".isset()", function() {

    it("returns true if a element exist", function() {

      var entity = new MyModel();
      entity.set('field1', 'foo');
      entity.set('field2', null);

      expect(entity.isset('field1')).toBe(true);
      expect(entity.isset('field2')).toBe(true);

    });

    it("returns false if a element doesn't exist", function() {

      var entity = new MyModel();
      expect(entity.isset('undefined')).toBe(false);

    });

  });

  describe(".offsetUnset()", function() {

    it("unsets items", function() {

      var data = {
        id: 1,
        title: 'test record',
        body: 'test body',
        enabled: true
      };

      var entity = MyModel.create(data);
      entity.unset('body');
      entity.unset('enabled');

      expect(entity.data()).toEqual({
        id: 1,
        title: 'test record'
      });

    });

  });

  describe(".to()", function() {

    it("exports into an array", function() {

      var data = {
        id: 1,
        title: 'test record'
      };

      var entity = MyModel.create(data);
      expect(entity.to('array')).toEqual(data);

    });

    it("exports direct relations", function() {

      var data = {
        name: 'amiga_1200.jpg',
        title: 'Amiga 1200',
        tags: [
          { name: 'tag1' }
        ]
      };

      var image = Image.create(data);
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
        gallery.get('images').get(0).set('name', '');
        gallery.get('images').get(1).set('name', '');
        expect(yield gallery.validate()).toBe(false);
        expect(gallery.errors()).toEqual({
          name: ['must not be a empty'],
          images: [
            { name: ['must not be a empty'] },
            { name: ['must not be a empty'] }
          ]
        });

        gallery.set('name', 'new gallery');
        gallery.get('images').get(0).set('name', 'image1');
        gallery.get('images').get(1).set('name', 'image2');
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

  });

});
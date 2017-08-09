var co = require('co');
var Model = require('../../../src/').Model;
var Document = require('../../../src/').Document;
var Collection = require('../../../src/collection/collection');
var Through = require('../../../src/collection/through');
var Schema = require('../../../src/schema');

var Gallery = require('../../fixture/model/gallery');
var GalleryDetail = require('../../fixture/model/gallery-detail');
var Image = require('../../fixture/model/image');
var ImageTag = require('../../fixture/model/image-tag');
var Tag = require('../../fixture/model/tag');

class MyImageTag extends ImageTag {
  static _define(schema) {
    schema.lock(false);
  }
}

class MyTag extends Tag {
  static _define(schema) {
    schema.lock(false);
  }
  tagMethod(options) {
    return options
  }
}

describe("Through", function() {

  beforeEach(function() {

    var image_tag, tag;

    this.images_tags = [];

    for (var i = 0; i < 5; i++) {
      image_tag = new MyImageTag();
      tag = new MyTag();
      tag.set('name', String(i));
      image_tag.set('tag', tag);
      this.images_tags.push(image_tag);
    }

    this.image = new Image({ 'data': {
      id: 1,
      name: 'amiga_1200.jpg',
      title: 'Amiga 1200',
      images_tags: this.images_tags
    }});

    this.through = new Through({
      schema: MyTag.definition(),
      parent: this.image,
      through: 'images_tags',
      using: 'tag'
    });

    this.image.set('tags', this.through);

  });

  afterEach(function() {
    MyImageTag.reset();
    MyTag.reset();
  });

  describe(".parents()", function() {

    it("gets the parents", function() {

      expect(this.through.parents().get(this.image)).toBe('tags');

    });

  });

  describe(".unsetParent()", function() {

    it("unsets a parent", function() {

      this.image.unset('tags');
      expect(this.through.parents().has(this.image)).toBe(false);

    });

  });

  describe("->disconnect()", function() {

    it("removes a collection from its graph", function() {

      this.image.get('tags').disconnect();
      expect(this.through.parents().has(this.image)).toBe(false);
      expect(this.image.has('tags')).toBe(false);

    });

  });

  describe(".basePath()", function() {

    it("always returns an emtpy root path", function() {

      expect(this.through.basePath()).toBe('');

    });

  });

  describe(".schema()", function() {

    it("returns the schema", function() {

      expect(this.through.schema()).toBe(MyTag.definition());

    });

  });

  describe(".meta()", function() {

    it("returns the meta attributes attached to the pivot collection", function() {

      var meta = { meta: { page: 5, limit: 10 } };
      this.image.set('images_tags', new Collection({ meta: meta }));
      expect(this.through.meta()).toEqual(meta);

    });

  });

  describe(".invoke()", function() {

    it("dispatches a method against all items in the collection", function() {

      var result = this.through.invoke('tagMethod', ['world']);
      expect(result).toEqual(['world', 'world', 'world', 'world', 'world']);

    });

  });

  describe(".apply()", function() {

    it("applies a filter on a collection", function() {

      var filter = function(item) {
        item.hello = 'world';
        return item;
      };
      var result = this.through.apply(filter);

      this.through.forEach(function(tag) {
        expect(tag.hello).toBe('world');
      });

      expect(this.through.count()).toBe(5);

    });

  });

  describe(".filter()", function() {

    it("extracts items from a collection according a filter", function() {

      var filter = function(item) {
        return item.get('name') % 2 === 0;
      };

      var result = this.through.filter(filter);

      expect(result instanceof Collection).toBe(true);
      expect(result.data()).toEqual([
        { name: '0' },
        { name: '2' },
        { name: '4' }
      ]);

    });

  });

  describe(".map()", function() {

    it("applies a Closure to a copy of all data in the collection", function() {

      var filter = function(item) {
        item.set('name', 'tag' + item.get('name'));
        return item;
      };

      var result = this.through.map(filter);

      expect(result instanceof Collection).toBe(true);
      expect(result.data()).toEqual([
        { name: 'tag0' },
        { name: 'tag1' },
        { name: 'tag2' },
        { name: 'tag3' },
        { name: 'tag4' }
      ]);

    });

  });

  describe(".reduce()", function() {

    it("reduces a collection down to a single value", function() {

      var filter = function(memo, item) {
        return memo + parseInt(item.get('name'));
      };

      expect(this.through.reduce(filter, 0)).toBe(10);
      expect(this.through.reduce(filter, 1)).toBe(11);

    });

  });

  describe(".slice()", function() {

    it("extracts a slice of items", function() {

      var result = this.through.slice(2, 4);

      expect(result instanceof Collection).toBe(true);
      expect(result.data()).toEqual([
        { name: '2' },
        { name: '3' }
      ]);

    });

  });

  describe(".splice()", function() {

    it("removes some items", function() {

      this.through.splice(2, 2);
      expect(this.through.data()).toEqual([
        { name: '0' },
        { name: '1' },
        { name: '4' }
      ]);

    });

    it("removes & adds some items", function() {

      this.through.splice(2, 2);
      expect(this.through.data()).toEqual([
        { name: '0' },
        { name: '1' },
        { name: '4' }
      ]);

    });

  });

  describe(".has()", function() {

    it("returns true if a element exist", function() {

      expect(this.through.has(0)).toBe(true);
      expect(this.through.has(1)).toBe(true);

    });

    it("returns false if a element doesn't exist", function() {

      expect(this.through.has(10)).toBe(false);

    });

  });

  describe(".push()", function() {

    it("pushes new items", function() {

      this.through.push({ name: 5 });
      expect(this.through.count()).toBe(6);

      expect(this.through.data()).toEqual([
        { name: '0' },
        { name: '1' },
        { name: '2' },
        { name: '3' },
        { name: '4' },
        { name: '5' }
      ]);

    });

  });

  describe(".set()/get()", function() {

    it("allows array access", function() {

      expect(this.through.get(0).data()).toEqual({ name: '0' });

    });

    it("sets at a specific key", function() {

      expect(this.through.set(0, { name: '10' })).toBe(this.through);
      expect(this.through.get(0).data()).toEqual({ name: '10' });
      expect(this.through.count()).toBe(5);

    });

  });

  describe(".unset()", function() {

    it("unsets items", function() {

      this.through.unset(1);
      this.through.unset(1);

      expect(this.through.count()).toBe(3);
      expect(this.through.data()).toEqual([
        { name: '0' },
        { name: '3' },
        { name: '4' }
      ]);

    });

  });

  describe(".keys()", function() {

    it("returns the item keys", function() {

      expect(this.through.keys()).toEqual([0, 1, 2, 3, 4]);

    });

  });

  describe(".count()", function() {

    it("returns the number of items in the collection", function() {

      expect(this.through.count()).toBe(5);
      expect(this.through.length).toBe(5);

    });

  });

  describe(".indexBy()", function() {

    it("indexes a collection using index number", function() {

      var indexes = this.through.indexBy('name', true);
      expect(indexes).toEqual({
        '0': [0],
        '1': [1],
        '2': [2],
        '3': [3],
        '4': [4]
      });

    });

    it("indexes a collection using values", function() {

      var indexes = this.through.indexBy('name');

      expect(indexes).toEqual({
        '0': [this.through.get(0)],
        '1': [this.through.get(1)],
        '2': [this.through.get(2)],
        '3': [this.through.get(3)],
        '4': [this.through.get(4)]
      });

    });

  });

  describe(".indexOf()", function() {

    it("returns the index of an item", function() {

      expect(this.through.indexOf(this.through.get(0))).toBe(0);
      expect(this.through.indexOf(this.through.get(1))).toBe(1);
      expect(this.through.indexOf(this.through.get(2))).toBe(2);
      expect(this.through.indexOf(this.through.get(3))).toBe(3);
      expect(this.through.indexOf(this.through.get(4))).toBe(4);

    });

  });

  describe(".lastIndexOf()", function() {

    it("returns the last index of an item", function() {

      this.through.push(this.through.get(2));

      expect(this.through.lastIndexOf(this.through.get(2))).toBe(5);

    });

  });

  describe(".indexOfId()", function() {

    it("returns the index of an entity with a defined id", function() {

      var filter = function(item) {
        item.set('id', Number.parseInt(item.get('name')));
        return item;
      };
      var result = this.through.apply(filter);

      expect(this.through.indexOfId(0)).toBe(0);
      expect(this.through.indexOfId(1)).toBe(1);
      expect(this.through.indexOfId(2)).toBe(2);
      expect(this.through.indexOfId(3)).toBe(3);
      expect(this.through.indexOfId(4)).toBe(4);

    });

  });

  describe(".append()", function() {

    it("appends two collection", function() {

      var collection = new Collection({ data: [
        { name: '5' },
        { name: '6' }
      ]});

      this.through.append(collection);

      expect(this.through.data()).toEqual([
        { name: '0' },
        { name: '1' },
        { name: '2' },
        { name: '3' },
        { name: '4' },
        { name: '5' },
        { name: '6' }
      ]);

    });

    it("appends two collection with key preservation", function() {

      var collection = new Collection({ data: [
        { name: '5' },
        { name: '6' }
      ]});

      this.through.append(collection);

      expect(this.through.data()).toEqual([
        { name: '0' },
        { name: '1' },
        { name: '2' },
        { name: '3' },
        { name: '4' },
        { name: '5' },
        { name: '6' }
      ]);

    });

  });

  describe(".embed()", function() {

    it("delegates the call up to the schema instance", function() {

      var schema = MyTag.definition();
      var stub = spyOn(schema, 'embed');

      this.through.embed(['relation1.relation2']);
      expect(stub).toHaveBeenCalledWith(this.through, ['relation1.relation2']);

    });

  });

  describe(".data()", function() {

    it("calls `format()`", function() {

      var spy = spyOn(Collection, 'format');

      var options = {};
      this.through.data(options);

      expect(spy).toHaveBeenCalledWith('array', this.through, options);

    });

  });


  describe(".validates()", function() {

    it("returns `true` when no validation error occur", function(done) {

      co(function*() {
        var image = Image.create();
        image.get('tags').push(Tag.create());
        image.get('tags').push(Tag.create());

        expect(yield image.get('tags').validates()).toBe(true);
        done();
      });

    });

    it("returns `false` when a validation error occurs", function(done) {

      co(function*() {
        var validator = Tag.validator();
        validator.rule('name', 'not:empty');

        var image = Image.create();
        image.get('tags').push(Tag.create());
        image.get('tags').push(Tag.create());

        expect(yield image.get('tags').validates()).toBe(false);

        expect(image.get('tags').errors()).toEqual([
          {
            name: [
              'is required'
            ]
          },
          {
            name: [
              'is required'
            ]
          }
        ]);
        done();
      });

    });

  });

  describe(".errors()", function() {

    it("returns errors", function(done) {

      co(function*() {
        var validator = Tag.validator();
        validator.rule('name', 'not:empty');

        var image = Image.create();
        image.get('tags').push(Tag.create());
        image.get('tags').push(Tag.create());

        expect(yield image.validates()).toBe(false);

        expect(image.get('tags').errors()).toEqual([
          {
            name: [
              'is required'
            ]
          },
          {
            name: [
              'is required'
            ]
          }
        ]);
        done();
      });

    });

  });
});
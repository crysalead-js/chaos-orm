import { Document, Collection, Through, Schema, Model } from '../../../src';
import Gallery from '../../fixture/model/gallery';
import GalleryDetail from '../../fixture/model/gallery-detail';
import Image from '../../fixture/model/image';
import ImageTag from '../../fixture/model/image-tag';
import Tag from '../../fixture/model/tag';

class MyImageTag extends ImageTag {
  static _define(schema) {
    schema.locked(false);
  }
}

class MyTag extends Tag {
  static _define(schema) {
    schema.locked(false);
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
      parent: this.image,
      schema: MyTag.definition(),
      through: 'images_tags',
      using: 'tag'
    });

  });

  afterEach(function() {
    MyImageTag.reset();
    MyTag.reset();
  });

  describe(".parent()", function() {

    it("gets the parent", function() {

      expect(this.through.parent()).toBe(this.image);

    });

    it("sets a parent", function() {

      var parent = new Document;
      this.through.parent(parent);
      expect(this.through.parent()).toBe(parent);

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

  describe(".find()", function() {

    it("extracts items from a collection according a filter", function() {

      var filter = function(item) {
        return item.get('name') % 2 === 0;
      };

      var result = this.through.find(filter);

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

      var result = this.through.slice(2, 2);

      expect(result instanceof Collection).toBe(true);
      expect(result.data()).toEqual([
        { name: '2' },
        { name: '3' }
      ]);

    });

  });

  describe(".isset()", function() {

    it("returns true if a element exist", function() {

      expect(this.through.isset(0)).toBe(true);
      expect(this.through.isset(1)).toBe(true);

    });

    it("returns false if a element doesn't exist", function() {

      expect(this.through.isset(10)).toBe(false);

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

  describe(".merge()", function() {

    it("merges two collection", function() {

      var collection = new Collection({ data: [
        { name: '5' },
        { name: '6' }
      ]});

      this.through.merge(collection);

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

    it("merges two collection with key preservation", function() {

      var collection = new Collection({ data: [
        { name: '5' },
        { name: '6' }
      ]});

      this.through.merge(collection);

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

    it("calls `toArray()`", function() {

      var spy = spyOn(Collection, 'toArray');

      var options = {};
      this.through.data(options);

      expect(spy).toHaveBeenCalledWith(this.through, options);

    });

  });

});
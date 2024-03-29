var co = require('co');
var Conventions = require('../../../src/conventions');
var Relationship = require('../../../src/relationship');
var Model = require('../../../src/').Model;
var HasMany = require('../../../src/relationship/has-many');

var Gallery = require('../../fixture/model/gallery');
var Image = require('../../fixture/model/image');
var ImageTag = require('../../fixture/model/image-tag');
var Tag = require('../../fixture/model/tag');

describe("HasMany", function() {

  beforeEach(function() {
    this.conventions = new Conventions();
    this.key = this.conventions.apply('key');
  });

  afterEach(function() {
    Image.reset();
    ImageTag.reset();
    Gallery.reset();
  });

  describe(".constructor()", function() {

    it("creates a hasMany relationship", function() {

      var relation = new HasMany({
        from: Gallery,
        to: Image
      });

      expect(relation.name()).toBe(this.conventions.apply('field', 'Image'));

      var foreignKey = this.conventions.apply('reference', 'Gallery');

      var expected = {};
      expected[this.key] = foreignKey;
      expect(relation.keys()).toEqual(expected);

      expect(relation.from()).toBe(Gallery);
      expect(relation.to()).toBe(Image);
      expect(relation.link()).toBe(Relationship.LINK_KEY);
      expect(relation.fields()).toBe(true);
      expect(relation.conditions()).toEqual(undefined);
      expect(relation.conventions() instanceof Conventions).toBe(true);

    });

    it("throws an exception if `'from'` is missing", function() {

      var closure = function() {
        new HasMany({
          to: Image
        });
      };
      expect(closure).toThrow(new Error("The relationship `'from'` option can't be empty."));

    });

    it("throws an exception if `'to'` is missing", function() {

      var closure = function() {
        new HasMany({
          from: Gallery
        });
      };
      expect(closure).toThrow(new Error("The relationship `'to'` option can't be empty."));

    });

  });

  describe(".embed()", function() {

    beforeEach(function() {

      spyOn(Image, 'all').and.callFake(function(options, fetchOptions) {
        fetchOptions = fetchOptions || {};
        var images =  Image.create([
          { id: 1, gallery_id: 1, title: 'Amiga 1200' },
          { id: 2, gallery_id: 1, title: 'Srinivasa Ramanujan' },
          { id: 3, gallery_id: 1, title: 'Las Vegas' },
          { id: 4, gallery_id: 2, title: 'Silicon Valley' },
          { id: 5, gallery_id: 2, title: 'Unknown' }
        ], {
          type: 'set', exists: true
        });
        if (fetchOptions['return'] && fetchOptions['return'] === 'object') {
          return Promise.resolve(images.data());
        }
        return Promise.resolve(images);
      });

      spyOn(Tag, 'all').and.callFake(function(options, fetchOptions) {
        fetchOptions = fetchOptions || {};
        var tags =  Tag.create([
          { id: 4, title: 'Computer' },
          { id: 5, title: 'Science' },
          { id: 6, title: 'Landscape' },
          { id: 7, title: 'Sport' }
        ], {
          type: 'set', exists: true
        });
        if (fetchOptions['return'] && fetchOptions['return'] === 'object') {
          return Promise.resolve(tags.data());
        }
        return Promise.resolve(tags);
      });

    });

    it("embeds a hasMany relationship", function(done) {

      var hasMany = Gallery.definition().relation('images');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery' },
        { id: 2, name: 'Bar Gallery' }
      ], { type: 'set', exists: true });

      galleries.embed(['images']).then(function() {
        expect(Image.all).toHaveBeenCalledWith({
          conditions: { gallery_id: [1, 2] }
        }, {});

        galleries.forEach(function(gallery) {
          expect(gallery.get('images').length).not.toBe(0);
          gallery.get('images').forEach(function(image) {
            expect(image.get('gallery_id')).toBe(gallery.get('id'));
          });
        });
        done();
      });

    });

    it("embeds a hasMany relationship using object hydration", function(done) {

      var hasMany = Gallery.definition().relation('images');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery' },
        { id: 2, name: 'Bar Gallery' }
      ], { type: 'set', exists: true });

      galleries = galleries.data();

      hasMany.embed(galleries, { fetchOptions: { 'return': 'object' } }).then(function() {
        expect(Image.all).toHaveBeenCalledWith({
          conditions: { gallery_id: [1, 2] }
        }, {
          'return': 'object'
        });

        galleries.forEach(function(gallery) {
          expect(gallery.images.length).not.toBe(0);
          gallery.images.forEach(function(image) {
            expect(gallery.id).toBe(image.gallery_id);
            expect(image instanceof Model).toBe(false);
          });
        });
        done();
      });

    });

    it("embeds a hasMany LINK_KEY_LIST relationship", function(done) {

      var hasMany = Gallery.definition().relation('images');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery', tag_ids: [4, 5] },
        { id: 2, name: 'Bar Gallery', tag_ids: [6, 7] }
      ], { type: 'set', exists: true });

      galleries.embed(['tags']).then(function() {
        expect(Tag.all).toHaveBeenCalledWith({
          conditions: { id: [4, 5, 6, 7] }
        }, {});

        galleries.forEach(function(gallery) {
          expect(gallery.get('tags').length).not.toBe(0);
          gallery.get('tags').forEach(function(tag) {
            expect(gallery.get('tag_ids').get()).toContain(tag.id());
          });
        });
        done();
      });

    });

    it("embeds a hasMany LINK_KEY_LIST relationship using object hydration", function(done) {

      var hasMany = Gallery.definition().relation('tags');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery', tag_ids: [4, 5] },
        { id: 2, name: 'Bar Gallery', tag_ids: [6, 7] }
      ], { type: 'set', exists: true });

      galleries = galleries.data();

      hasMany.embed(galleries, { fetchOptions: { 'return': 'object' } }).then(function() {
        expect(Tag.all).toHaveBeenCalledWith({
          conditions: { id: [4, 5, 6, 7] }
        }, {
          'return': 'object'
        });

        galleries.forEach(function(gallery) {
          expect(gallery.tags.length).not.toBe(0);
          gallery.tags.forEach(function(tag) {
            expect(gallery.tag_ids).toContain(tag.id);
            expect(tag instanceof Model).toBe(false);
          });
        });
        done();
      });

    });

  });

  describe(".get()", function() {

    it("throws an exception when a lazy load is necessary", function() {

      var closure = function() {
        var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
        gallery.get('images');
      };

      expect(closure).toThrow(new Error("The relation `'images'` is an external relation, use `fetch()` to lazy load its data."));

    });

  });

  describe(".fetch()", function() {

      it("returns an empty collection when no hasMany relation exists", function(done) {

        co(function*() {
          spyOn(Image, 'all').and.callFake(function(options, fetchOptions) {
            var images =  Image.create({}, { type: 'set', exists: true });
            return Promise.resolve(images);
          });

          var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
          var images = yield gallery.fetch('images');

          expect(Image.all).toHaveBeenCalledWith({ conditions: { gallery_id: 1 } }, {});
          expect(images.count()).toBe(0);
          done();
        });

      });

      it("lazy loads a hasMany relation", function(done) {

        co(function*() {
          spyOn(Image, 'all').and.callFake(function(options, fetchOptions) {
            var images =  Image.create([
              { id: 1, gallery_id: 1, title: 'Amiga 1200' },
              { id: 2, gallery_id: 1, title: 'Srinivasa Ramanujan' },
              { id: 3, gallery_id: 1, title: 'Las Vegas' }
            ], { type: 'set', exists: true });
            return Promise.resolve(images);
          });

          var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
          var images = yield gallery.fetch('images');

          expect(Image.all).toHaveBeenCalledWith({ conditions: { gallery_id: 1 } }, {});

          for (var image of images) {
            expect(image.get('gallery_id')).toBe(gallery.id());
          }
          done();
        });

      });

  });

  describe(".save()", function() {

    it("bails out if no relation data hasn't been setted", function(done) {

      var hasMany = Gallery.definition().relation('images');
      var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' },  { exists: true });
      hasMany.save(gallery).then(function() {
        expect(gallery.has('images')).toBe(false);
        done();
      });

    });

    it("saves a hasMany relationship", function(done) {

      spyOn(Image, 'all').and.callFake(function() {
        return Promise.resolve(Image.create([], { type: 'set' }));
      });

      var hasMany = Gallery.definition().relation('images');

      var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
      gallery.set('images', [{ name: 'Foo Image' }]);

      spyOn(gallery.get('images').get(0), 'save').and.callFake(function() {
        gallery.get('images').get(0).set('id', 1);
        return Promise.resolve(gallery);
      });

      hasMany.save(gallery).then(function() {
        expect(gallery.get('images').get(0).save).toHaveBeenCalled();
        expect(gallery.get('images').get(0).get('gallery_id')).toBe(gallery.get('id'));
        done();
      });

    });

    it("assures removed association to be unsetted", function(done) {

      var toUnset = Image.create({ id: 2, gallery_id: 1, title: 'Srinivasa Ramanujan' }, { exists: true });
      var toKeep = Image.create({ id: 3, gallery_id: 1, title: 'Las Vegas' }, { exists: true });

      spyOn(Image, 'all').and.callFake(function(options, fetchOptions) {
        return Promise.resolve(Image.create([toUnset, toKeep], { type: 'set' }));
      });

      var hasMany = Gallery.definition().relation('images');

      var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
      gallery.set('images', [{ title: 'Amiga 1200' }, toKeep]);

      spyOn(gallery.get('images').get(0), 'save').and.callFake(function() {
        gallery.get('images').get(0).set('id', 1);
        return Promise.resolve(gallery);
      });

      spyOn(toKeep, 'save').and.returnValue(Promise.resolve(toKeep));
      spyOn(toUnset, 'save').and.returnValue(Promise.resolve(toUnset));

      hasMany.save(gallery).then(function() {
        expect(toUnset.exists()).toBe(true);
        expect(toUnset.get('gallery_id')).toBe(null);
        expect(gallery.get('images').get(0).get('gallery_id')).toBe(gallery.get('id'));

        expect(gallery.get('images').get(0).save).toHaveBeenCalled();
        expect(toKeep.save).toHaveBeenCalled();
        expect(toUnset.save).toHaveBeenCalled();
        done();
      });

    });

    it("assures removed associative entity to be deleted", function(done) {

      var toDelete = ImageTag.create({ id: 5, image_id: 4, tag_id: 6 }, { exists: true });
      var toKeep = ImageTag.create({ id: 6, image_id: 4, tag_id: 3 }, { exists: true });

      spyOn(ImageTag, 'all').and.callFake(function(options, fetchOptions) {
        return Promise.resolve(ImageTag.create([toDelete, toKeep], { type: 'set' }));
      });

      var hasMany = Image.definition().relation('images_tags');

      var image = Image.create({ id: 4, gallery_id: 2, title: 'Silicon Valley' }, { exists: true });
      image.set('images_tags', [{ tag_id: 1 }, toKeep]);

      spyOn(image.get('images_tags').get(0), 'save').and.callFake(function() {
        image.get('images_tags').get(0).set('id', 7);
        return Promise.resolve(image);
      });

      var schema = ImageTag.definition();
      spyOn(toKeep, 'save').and.returnValue(Promise.resolve(toKeep));
      spyOn(schema, 'remove').and.returnValue(Promise.resolve(true));

      hasMany.save(image).then(function() {
        expect(toDelete.exists()).toBe(false);
        expect(image.get('images_tags').get(0).get('image_id')).toBe(image.get('id'));

        expect(image.get('images_tags').get(0).save).toHaveBeenCalled();
        expect(toKeep.save).toHaveBeenCalled();
        expect(schema.remove).toHaveBeenCalledWith({ id: 5 });
        done();
      });

    });

    it("assures removed associative entity to be deleted according to the defined scope", function(done) {

      co(function*() {
        var schema = Image.definition();
        schema.hasMany('images_tags', 'ImageTag', {
          keys: { id: 'tag_id' },
          conditions: { scope: 1 }
        });

        var result = {};

        spyOn(ImageTag, 'all').and.callFake(function(options) {
          result = options;
          return Promise.resolve(ImageTag.create([], { type: 'set' }));
        });

        var relation = schema.relation('images_tags');

        yield relation.save(Image.create({ id: 4, gallery_id: 2, title: 'Silicon Valley', images_tags: [] }, { exists: true }));

        expect(result.conditions).toEqual({
          tag_id: 4,
          scope: 1
        });
        done();
      });
    });

  });

});
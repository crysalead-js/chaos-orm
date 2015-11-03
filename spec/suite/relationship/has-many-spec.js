import Conventions from '../../../src/conventions';
import Relationship from '../../../src/relationship';
import HasMany from '../../../src/relationship/has-many';
import Model from '../../../src/model';

import Gallery from '../../fixture/model/gallery';
import Image from '../../fixture/model/image';
import ImageTag from '../../fixture/model/image-tag';

describe("HasMany", function() {

  beforeEach(function() {
    this.conventions = new Conventions();
    this.primaryKey = this.conventions.apply('primaryKey');
  });

  describe(".constructor()", function() {

    it("creates a hasMany relationship", function() {

      var relation = new HasMany({
        from: Gallery,
        to: Image
      });

      expect(relation.name()).toBe(this.conventions.apply('fieldName', 'Image'));

      var foreignKey = this.conventions.apply('foreignKey', 'Gallery');

      var expected = {};
      expected[this.primaryKey] = foreignKey;
      expect(relation.keys()).toEqual(expected);

      expect(relation.from()).toBe(Gallery);
      expect(relation.to()).toBe(Image);
      expect(relation.link()).toBe(Relationship.LINK_KEY);
      expect(relation.fields()).toBe(true);
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
          type: 'set', exists: true, collector: fetchOptions.collector
        });
        if (fetchOptions['return'] && fetchOptions['return'] === 'object') {
          return Promise.resolve(images.data());
        }
        return Promise.resolve(images);
      });

    });

    it("embeds a hasMany relationship", function(done) {

      var hasMany = Gallery.relation('images');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery' },
        { id: 2, name: 'Bar Gallery' }
      ], { type: 'set', exists: true });

      galleries.embed(['images']).then(function() {
        expect(Image.all).toHaveBeenCalledWith({
          conditions: { gallery_id: ['1', '2'] }
        }, {
          collector: galleries.collector()
        });

        galleries.forEach(function(gallery) {
          gallery.get('images').forEach(function(image) {
            expect(image.get('gallery_id')).toBe(gallery.get('id'));
            expect(gallery.collector()).toBe(galleries.collector());
            expect(image.collector()).toBe(galleries.collector());
          });
        });
        done();
      });

    });

    it("embeds a hasMany relationship using object hydration", function(done) {

      var hasMany = Gallery.relation('images');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery' },
        { id: 2, name: 'Bar Gallery' }
      ], { type: 'set', exists: true });

      galleries = galleries.data();

      hasMany.embed(galleries, { fetchOptions: { 'return': 'object' } }).then(function() {
        expect(Image.all).toHaveBeenCalledWith({
          conditions: { gallery_id: ['1', '2'] }
        }, {
          'return': 'object'
        });

        galleries.forEach(function(gallery) {
          gallery.images.forEach(function(image) {
            expect(gallery.id).toBe(image.gallery_id);
            expect(image instanceof Model).toBe(false);
          });
        });
        done();
      });

    });

  });

  describe(".save()", function() {

    it("bails out if no relation data hasn't been setted", function(done) {

      var hasMany = Gallery.relation('images');
      var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' },  { exists: true });
      hasMany.save(gallery).then(function() {
        expect(gallery.isset('images')).toBe(false);
        done();
      });

    });

    it("saves a hasMany relationship", function(done) {

      spyOn(Image, 'all').and.callFake(function() {
        return Promise.resolve(Image.create([], { type: 'set' }));
      });

      var hasMany = Gallery.relation('images');

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

      var hasMany = Gallery.relation('images');

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
        expect(toUnset.get('gallery_id')).toBe(undefined);
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

      var hasMany = Image.relation('images_tags');

      var image = Image.create({ id: 4, gallery_id: 2, title: 'Silicon Valley' }, { exists: true });
      image.set('images_tags', [{ tag_id: 1 }, toKeep]);

      spyOn(image.get('images_tags').get(0), 'save').and.callFake(function() {
        image.get('images_tags').get(0).set('id', 7);
        return Promise.resolve(image);
      });

      var schema = ImageTag.schema();
      spyOn(toKeep, 'save').and.returnValue(Promise.resolve(toKeep));
      spyOn(schema, 'delete').and.returnValue(Promise.resolve());

      hasMany.save(image).then(function() {
        expect(toDelete.exists()).toBe(false);
        expect(image.get('images_tags').get(0).get('image_id')).toBe(image.get('id'));

        expect(image.get('images_tags').get(0).save).toHaveBeenCalled();
        expect(toKeep.save).toHaveBeenCalled();
        expect(schema.delete).toHaveBeenCalledWith({ id: 5 });
        done();
      });

    });

  });

});
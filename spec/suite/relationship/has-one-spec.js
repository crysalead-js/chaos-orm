import { Conventions, Relationship, Model, HasOne } from '../../../src';

import GalleryDetail from '../../fixture/model/gallery-detail';
import Gallery from '../../fixture/model/gallery';

describe("HasOne", function() {

  beforeEach(function() {
    this.conventions = new Conventions();
    this.key = this.conventions.apply('key');
  });

  describe(".constructor()", function() {

    it("creates a belongsTo relationship", function() {

      var relation = new HasOne({
        from: Gallery,
        to: GalleryDetail
      });

      expect(relation.name()).toBe(this.conventions.apply('field', 'GalleryDetail'));

      var foreignKey = this.conventions.apply('reference', 'Gallery');

      var expected = {};
      expected[this.key] = foreignKey;
      expect(relation.keys()).toEqual(expected);

      expect(relation.from()).toBe(Gallery);
      expect(relation.to()).toBe(GalleryDetail);
      expect(relation.link()).toBe(Relationship.LINK_KEY);
      expect(relation.fields()).toBe(true);
      expect(relation.conventions() instanceof Conventions).toBe(true);

    });

    it("throws an exception if `'from'` is missing", function() {

      var closure = function() {
        new HasOne({
          to: GalleryDetail
        });
      };
      expect(closure).toThrow(new Error("The relationship `'from'` option can't be empty."));

    });

    it("throws an exception if `'to'` is missing", function() {

      var closure = function() {
        new HasOne({
          from: Gallery
        });
      };
      expect(closure).toThrow(new Error("The relationship `'to'` option can't be empty."));

    });

  });

  describe(".embed()", function() {

    beforeEach(function() {

      spyOn(GalleryDetail, 'all').and.callFake(function(options, fetchOptions) {
        fetchOptions = fetchOptions || {};
        var details =  GalleryDetail.create([
          { id: 1, description: 'Foo Gallery Description', gallery_id: 1 },
          { id: 2, description: 'Bar Gallery Description', gallery_id: 2 }
        ], {
          type: 'set', exists: true, collector: fetchOptions.collector
        });
        if (fetchOptions['return'] && fetchOptions['return'] === 'object') {
          return Promise.resolve(details.data());
        }
        return Promise.resolve(details);
      });

    });

    it("embeds a hasOne relationship", function(done) {

      var hasOne = Gallery.relation('detail');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery' },
        { id: 2, name: 'Bar Gallery' }
      ], { type: 'set' });

      galleries.embed(['detail']).then(function() {

        expect(GalleryDetail.all).toHaveBeenCalledWith({
          conditions: { gallery_id: ['1', '2'] }
        }, {
          collector: galleries.collector()
        });

        galleries.forEach(function(gallery) {
          expect(gallery.get('detail').get('gallery_id')).toBe(gallery.get('id'));
          expect(gallery.get('detail').collector()).toBe(gallery.collector());
          expect(gallery.get('detail').collector()).toBe(galleries.collector());
        });
        done();
      });

    });

    it("embeds a hasOne relationship using object hydration", function(done) {

      var hasOne = Gallery.relation('detail');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery' },
        { id: 2, name: 'Bar Gallery' }
      ], { type: 'set' });

      galleries = galleries.data();

      hasOne.embed(galleries, { fetchOptions: { 'return': 'object' } }).then(function() {

        expect(GalleryDetail.all).toHaveBeenCalledWith({
          conditions: { gallery_id: ['1', '2'] }
        }, {
          'collector': undefined,
          'return': 'object'
        });

        galleries.forEach(function(gallery) {
          expect(gallery['detail']['gallery_id']).toBe(gallery['id']);
          expect(gallery['detail'] instanceof Model).toBe(false);
        });
        done();
      });

    });

  });

  describe(".save()", function() {

    it("bails out if no relation data hasn't been setted", function(done) {

      var hasOne = Gallery.relation('detail');
      var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
      hasOne.save(gallery).then(function() {
        expect(gallery.isset('detail')).toBe(false);
        done();
      });
    });

    it("saves a hasOne relationship", function(done) {

      var hasOne = Gallery.relation('detail');

      var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
      gallery.set('detail', { description: 'Foo GalleryDetail' });

      spyOn(gallery.get('detail'), 'save').and.callFake(function() {
        gallery.get('detail').set('id', 1);
        return Promise.resolve(gallery);
      });

      hasOne.save(gallery).then(function() {
        expect(gallery.get('detail').save).toHaveBeenCalled();
        expect(gallery.get('detail').get('gallery_id')).toBe(gallery.get('detail').get('id'));
        done();
      });

    });

  });

});

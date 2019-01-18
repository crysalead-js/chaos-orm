var co = require('co');
var Conventions = require('../../../src/conventions');
var Relationship = require('../../../src/relationship');
var Model = require('../../../src/').Model;
var HasOne = require('../../../src/relationship/has-one');

var Gallery = require('../../fixture/model/gallery');
var GalleryDetail = require('../../fixture/model/gallery-detail');

describe("HasOne", function() {

  beforeEach(function() {
    this.conventions = new Conventions();
    this.key = this.conventions.apply('key');
  });

  afterEach(function() {
    Gallery.reset();
    GalleryDetail.reset();
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
      expect(relation.conditions()).toEqual(undefined);
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
          type: 'set', exists: true
        });
        if (fetchOptions['return'] && fetchOptions['return'] === 'object') {
          return Promise.resolve(details.data());
        }
        return Promise.resolve(details);
      });

    });

    it("embeds a hasOne relationship", function(done) {

      var hasOne = Gallery.definition().relation('detail');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery' },
        { id: 2, name: 'Bar Gallery' }
      ], { type: 'set' });

      galleries.embed(['detail']).then(function() {

        expect(GalleryDetail.all).toHaveBeenCalledWith({
          conditions: { gallery_id: [1, 2] }
        }, {});

        galleries.forEach(function(gallery) {
          expect(gallery.get('detail').get('gallery_id')).toBe(gallery.get('id'));
        });
        done();
      });

    });

    it("embeds a hasOne relationship using object hydration", function(done) {

      var hasOne = Gallery.definition().relation('detail');

      var galleries = Gallery.create([
        { id: 1, name: 'Foo Gallery' },
        { id: 2, name: 'Bar Gallery' }
      ], { type: 'set' });

      galleries = galleries.data();

      hasOne.embed(galleries, { fetchOptions: { 'return': 'object' } }).then(function() {

        expect(GalleryDetail.all).toHaveBeenCalledWith({
          conditions: { gallery_id: [1, 2] }
        }, {
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

  describe(".get()", function() {

    it("throws an exception when a lazy load is necessary", function() {

      var closure = function() {
        var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
        detail = gallery.get('detail');
      };

      expect(closure).toThrow(new Error("The relation `'detail'` is an external relation, use `fetch()` to lazy load its data."));

    });

  });

  describe(".fetch()", function() {

    it("returns `null` for unexisting foreign key", function(done) {

      co(function*()  {
        spyOn(GalleryDetail, 'all').and.callFake(function(options, fetchOptions) {
          return Promise.resolve(GalleryDetail.create({}, { type: 'set', exists: true }));
        });

        var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
        var detail = yield gallery.fetch('detail');

        expect(GalleryDetail.all).toHaveBeenCalledWith({ conditions: { gallery_id: 1 } }, {});
        expect(detail).toBe(null);

        done();
      });

    });

    it("lazy loads a hasOne relation", function(done) {

      co(function*()  {
        spyOn(GalleryDetail, 'all').and.callFake(function(options, fetchOptions) {
          var details = GalleryDetail.create([
            { id: 1, description: 'Foo Gallery Description', gallery_id: 1 }
          ], { type: 'set', exists: true });
          return Promise.resolve(details);
        });

        var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
        var detail = yield gallery.fetch('detail');

        expect(GalleryDetail.all).toHaveBeenCalledWith({ conditions: { gallery_id: 1 } }, {});
        expect(detail.get('gallery_id')).toBe(gallery.id());

        done();
      });

    });

  });

  describe(".save()", function() {

    it("bails out if no relation data hasn't been setted", function(done) {

      var hasOne = Gallery.definition().relation('detail');
      var gallery = Gallery.create({ id: 1, name: 'Foo Gallery' }, { exists: true });
      hasOne.save(gallery).then(function() {
        expect(gallery.has('detail')).toBe(false);
        done();
      });
    });

    it("saves a hasOne relationship", function(done) {

      var hasOne = Gallery.definition().relation('detail');

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

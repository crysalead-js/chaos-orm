var co = require('co');
var Conventions = require('../../../src/conventions');
var Relationship = require('../../../src/relationship');
var Model = require('../../../src/').Model;
var BelongsTo = require('../../../src/relationship/belongs-to');

var Gallery = require('../../fixture/model/gallery');
var Image = require('../../fixture/model/image');

describe("BelongsTo", function() {

  beforeEach(function() {
    this.conventions = new Conventions();
    this.key = this.conventions.apply('key');
  });

  afterEach(function() {
    Gallery.reset();
    Image.reset();
  });

  describe(".constructor()", function() {

    it("creates a belongsTo relationship", function() {

      var relation = new BelongsTo({
        from: Image,
        to: Gallery
      });

      expect(relation.name()).toBe(this.conventions.apply('field', 'Gallery'));

      var foreignKey = this.conventions.apply('reference', 'Gallery');
      expect(relation.keys()).toEqual({[foreignKey]: this.key});

      expect(relation.from()).toBe(Image);
      expect(relation.to()).toBe(Gallery);
      expect(relation.link()).toBe(Relationship.LINK_KEY);
      expect(relation.fields()).toBe(true);
      expect(relation.conditions()).toEqual(undefined);
      expect(relation.conventions() instanceof Conventions).toBe(true);

    });

    it("throws an exception if `'from'` is missing", function() {

      var closure = function() {
        new BelongsTo({
          to: Gallery
        });
      };
      expect(closure).toThrow(new Error("The relationship `'from'` option can't be empty."));

    });

    it("throws an exception if `'to'` is missing", function() {

      var closure = function() {
        new BelongsTo({
          from: Image
        });
      };
      expect(closure).toThrow(new Error("The relationship `'to'` option can't be empty."));

    });

  });

  describe(".embed()", function() {

    beforeEach(function() {

      spyOn(Gallery, 'all').and.callFake(function(options, fetchOptions) {
        fetchOptions = fetchOptions || {};
        var galleries =  Gallery.create([
          { id: 1, name: 'Foo Gallery' },
          { id: 2, name: 'Bar Gallery' }
        ], {
          type: 'set', exists: true
        });
        if (fetchOptions['return'] && fetchOptions['return'] === 'object') {
          return Promise.resolve(galleries.data());
        }
        return Promise.resolve(galleries);
      });

    });

    it("embeds a belongsTo relationship", function(done) {

      var belongsTo = Image.definition().relation('gallery');

      var images = Image.create([
        { gallery_id: 1, title: 'Amiga 1200' },
        { gallery_id: 1, title: 'Srinivasa Ramanujan' },
        { gallery_id: 1, title: 'Las Vegas' },
        { gallery_id: 2, title: 'Silicon Valley' },
        { gallery_id: 2, title: 'Unknown' }
      ], { type: 'set' });

      images.embed(['gallery']).then(function() {

        expect(Gallery.all).toHaveBeenCalledWith({
          conditions: { id: [1, 2] }
        }, {});

        images.forEach(function(image) {
          expect(image.get('gallery').get('id')).toBe(image.get('gallery_id'));
        });
        done();
      });

    });

    it("embeds a belongsTo relationship using object hydration", function(done) {

      var belongsTo = Image.definition().relation('gallery');

      var images = Image.create([
        { gallery_id: 1, title: 'Amiga 1200' },
        { gallery_id: 1, title: 'Srinivasa Ramanujan' },
        { gallery_id: 1, title: 'Las Vegas' },
        { gallery_id: 2, title: 'Silicon Valley' },
        { gallery_id: 2, title: 'Unknown' }
      ], { type: 'set' });

      images = images.data();

      belongsTo.embed(images, { fetchOptions: { 'return': 'object' } }).then(function() {
        expect(Gallery.all).toHaveBeenCalledWith({
          conditions: { id: [1, 2] }
        }, {
          'return': 'object'
        });

        images.forEach(function(image) {
          expect(image['gallery']['id']).toBe(image['gallery_id']);
          expect(image['gallery'] instanceof Model).toBe(false);
        });

        done();
      });

    });

  });

  describe(".get()", function() {

    it("returns `null` for unexisting foreign key", function() {

      var image = Image.create({ id: 1, title: 'Amiga 1200' }, { exists: true });
      expect(image.get('gallery')).toBe(null);

    });

    it("throws an exception when a lazy load is necessary", function() {

      var closure = function() {
        var image = Image.create({ id: 1, title: 'Amiga 1200', 'gallery_id': 1 });
        image.get('gallery');
      };

      expect(closure).toThrow(new Error("The relation `'gallery'` is an external relation, use `fetch()` to lazy load its data."));

    });

  });

  describe(".fetch()", function() {

    it("returns `null` for unexisting foreign key", function(done) {

      co(function*()  {

        var image = Image.create({ id: 1, title: 'Amiga 1200' }, { exists: true });
        expect(yield image.fetch('gallery')).toBe(null);

        done();
      });

    });

    it("lazy loads a belongsTo relation", function(done) {

      co(function*()  {
        spyOn(Gallery, 'all').and.callFake(function(options, fetchOptions) {
          var galleries =  Gallery.create([
            { id: 1, name: 'Foo Gallery' }
          ], { type: 'set', exists: true });
          return Promise.resolve(galleries);
        });

        var image = Image.create({ id: 1, gallery_id: 1, title: 'Amiga 1200' }, { exists: true });
        var gallery = yield image.fetch('gallery');

        expect(Gallery.all).toHaveBeenCalledWith({ conditions: { id: 1 } }, {});
        expect(gallery.id()).toBe(image.get('gallery_id'));
        done();
      });

    });

  });

  describe(".save()", function() {

    it("bails out if no relation data hasn't been setted", function(done) {

      var belongsTo = Image.definition().relation('gallery');
      var image = Image.create({ id: 1, gallery_id: 1, title: 'Amiga 1200' });
      belongsTo.save(image).then(function() {
        expect(image.has('gallery')).toBe(false);
        done();
      });

    });

    it("saves a belongsTo relationship", function(done) {

      var belongsTo = Image.definition().relation('gallery');

      var image = Image.create({ id: 1, title: 'Amiga 1200' }, { exists: true });
      image.set('gallery', { name: 'Foo Gallery' });

      spyOn(image.get('gallery'), 'save').and.callFake(function() {
        image.get('gallery').set('id', 1);
        return Promise.resolve(image);
      });

      belongsTo.save(image).then(function() {
        expect(image.get('gallery').save).toHaveBeenCalled();
        expect(image.get('gallery_id')).toBe(image.get('gallery').get('id'));
        done();
      });

    });

    it("throws an exception if the saves relation didn't populate any ID", function(done) {

      var belongsTo = Image.definition().relation('gallery');

      var image = Image.create({ id: 1, gallery_id: 1, title: 'Amiga 1200' }, { exists: true });
      image.set('gallery', { name: 'Foo Gallery' });

      spyOn(image.get('gallery'), 'save').and.callFake(function() {
        return Promise.resolve(image);
      });

      belongsTo.save(image).catch(function(error) {
        expect(error).toEqual(new Error("The `'id'` key is missing from related data."));
        done();
      });

    });

  });

});
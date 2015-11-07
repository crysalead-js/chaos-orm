import Conventions from '../../../src/conventions';
import Relationship from '../../../src/relationship';
import BelongsTo from '../../../src/relationship/belongs-to';
import Model from '../../../src/model';

import Gallery from '../../fixture/model/gallery';
import Image from '../../fixture/model/image';

describe("BelongsTo", function() {

  beforeEach(function() {
    this.conventions = new Conventions();
    this.primaryKey = this.conventions.apply('primaryKey');
  });

  describe(".constructor()", function() {

    it("creates a belongsTo relationship", function() {

      var relation = new BelongsTo({
        from: Image,
        to: Gallery
      });

      expect(relation.name()).toBe(this.conventions.apply('fieldName', 'Gallery'));

      var foreignKey = this.conventions.apply('foreignKey', 'Image');

      var expected = {};
      expected[foreignKey] = this.primaryKey;
      expect(relation.keys()).toEqual(expected);

      expect(relation.from()).toBe(Image);
      expect(relation.to()).toBe(Gallery);
      expect(relation.link()).toBe(Relationship.LINK_KEY);
      expect(relation.fields()).toBe(true);
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
          type: 'set', exists: true, collector: fetchOptions.collector
        });
        if (fetchOptions['return'] && fetchOptions['return'] === 'object') {
          return Promise.resolve(galleries.data());
        }
        return Promise.resolve(galleries);
      });

    });

    it("embeds a belongsTo relationship", function(done) {

      var belongsTo = Image.relation('gallery');

      var images = Image.create([
        { gallery_id: 1, title: 'Amiga 1200' },
        { gallery_id: 1, title: 'Srinivasa Ramanujan' },
        { gallery_id: 1, title: 'Las Vegas' },
        { gallery_id: 2, title: 'Silicon Valley' },
        { gallery_id: 2, title: 'Unknown' }
      ], { type: 'set' });

      images.embed(['gallery']).then(function() {

        expect(Gallery.all).toHaveBeenCalledWith({
          conditions: { id: ['1', '2'] }
        }, {
          collector: images.collector()
        });

        images.forEach(function(image) {
          expect(image.get('gallery').get('id')).toBe(image.get('gallery_id'));
          expect(image.get('gallery').collector()).toBe(image.collector());
        });
        done();
      });

    });

    it("embeds a belongsTo relationship using object hydration", function(done) {

      var belongsTo = Image.relation('gallery');

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
          conditions: { id: ['1', '2'] }
        }, {
          'collector': undefined,
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

  describe(".save()", function() {

    it("bails out if no relation data hasn't been setted", function(done) {

      var belongsTo = Image.relation('gallery');
      var image = Image.create({ id: 1, gallery_id: 1, title: 'Amiga 1200' });
      belongsTo.save(image).then(function() {
        expect(image.isset('gallery')).toBe(false);
        done();
      });

    });

    it("saves a belongsTo relationship", function(done) {

      var belongsTo = Image.relation('gallery');

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

      var belongsTo = Image.relation('gallery');

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
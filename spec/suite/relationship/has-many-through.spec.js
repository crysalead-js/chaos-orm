var co = require('co');
var Conventions = require('../../../src/conventions');
var Relationship = require('../../../src/relationship');
var Model = require('../../../src/').Model;
var HasManyThrough = require('../../../src/relationship/has-many-through');

var Image = require('../../fixture/model/image');
var ImageTag = require('../../fixture/model/image-tag');
var Tag = require('../../fixture/model/tag');

describe("HasManyThrough", function() {

  beforeEach(function() {
    this.conventions = new Conventions();
    this.key = this.conventions.apply('key');
  });

  afterEach(function() {
    Image.reset();
    ImageTag.reset();
    Tag.reset();
  });

  describe(".constructor()", function() {

    it("creates a hasManyThrough relationship", function() {

      var relation = new HasManyThrough({
        from: Image,
        through: 'images_tags',
        using: 'tag'
      });

      expect(relation.name()).toBe(this.conventions.apply('field', 'Tag'));

      var foreignKey = this.conventions.apply('reference', 'tag');
      var expected = {};
      expected[foreignKey] = this.key;
      expect(relation.keys()).toEqual(expected);

      expect(relation.from()).toBe(Image);
      expect(relation.to()).toBe(Tag);
      expect(relation.through()).toBe('images_tags');
      expect(relation.using()).toBe(this.conventions.apply(
        'single',
        this.conventions.apply('field','Tag')
      ));
      expect(relation.link()).toBe(Relationship.LINK_KEY);
      expect(relation.fields()).toBe(true);
      expect(relation.conditions()).toEqual(undefined);
      expect(relation.conventions() instanceof Conventions).toBe(true);

    });

    it("throws an exception if `'from'` is missing", function() {

      var closure = function() {
        new HasManyThrough({
          through: 'images_tags',
          using: 'tag'
        });
      };
      expect(closure).toThrow(new Error("The relationship `'from'` option can't be empty."));

    });

    it("throws an exception is `'through'` is not set", function() {

      var closure = function() {
        new HasManyThrough({
          from: Image,
          using: 'tag'
        });
      };

      expect(closure).toThrow(new Error("The relationship `'through'` option can't be empty."));

    });

    it("throws an exception if `'using'` is missing", function() {

      var closure = function() {
        new HasManyThrough({
          from: Image,
          through: 'images_tags'
        });
      };
      expect(closure).toThrow(new Error("The relationship `'using'` option can't be empty."));

    });

  });

  describe(".embed()", function() {

    beforeEach(function() {
      spyOn(ImageTag, 'all').and.callFake(function(options, fetchOptions) {
        fetchOptions = fetchOptions || {};
        var imagesTags =  ImageTag.create([
          { id: 1, image_id: 1, tag_id: 1 },
          { id: 2, image_id: 1, tag_id: 3 },
          { id: 3, image_id: 2, tag_id: 5 },
          { id: 4, image_id: 3, tag_id: 6 },
          { id: 5, image_id: 4, tag_id: 6 },
          { id: 6, image_id: 4, tag_id: 3 },
          { id: 7, image_id: 4, tag_id: 1 }
        ], { type: 'set', exists: true });
        if (!fetchOptions['return']) {
          return Promise.resolve(imagesTags);
        }
        if (fetchOptions['return'] && fetchOptions['return'] === 'object') {
          return Promise.resolve(imagesTags.data());
        }
      });

      spyOn(Tag, 'all').and.callFake(function(options, fetchOptions) {
        fetchOptions = fetchOptions || {};
        var tags =  Tag.create([
          { id: 1, name: 'High Tech' },
          { id: 2, name: 'Sport' },
          { id: 3, name: 'Computer' },
          { id: 4, name: 'Art' },
          { id: 5, name: 'Science' },
          { id: 6, name: 'City' }
        ], { type: 'set', exists: true });
        if (!fetchOptions['return']) {
          return Promise.resolve(tags);
        }
        if (fetchOptions['return'] === 'object') {
          return Promise.resolve(tags.data());
        }
      });
    });

    it("embeds a hasManyThrough relationship", function(done) {

      var hasManyThrough = Image.definition().relation('tags');

      var images = Image.create([
        { id: 1, gallery_id: 1, title: 'Amiga 1200' },
        { id: 2, gallery_id: 1, title: 'Srinivasa Ramanujan' },
        { id: 3, gallery_id: 1, title: 'Las Vegas' },
        { id: 4, gallery_id: 2, title: 'Silicon Valley' },
        { id: 5, gallery_id: 2, title: 'Unknown' }
      ], { type: 'set', exists: true });

      images.embed(['tags']).then(function() {

        expect(ImageTag.all).toHaveBeenCalledWith({
          conditions: { image_id: [1, 2, 3, 4, 5] }
        }, {});

        expect(Tag.all).toHaveBeenCalledWith({
          conditions: { id: [1, 3, 5, 6] }
        }, {});

        images.forEach(function(image) {
          image.get('images_tags').forEach(function(image_tag, index) {
            expect(image_tag.get('tag')).not.toBe(undefined);
            expect(image.get('tags').get(index)).toBe(image_tag.get('tag'));
          });
        });
        done();

      });

    });

    it("embeds a hasManyThrough relationship using object hydration", function(done) {

      var hasManyThrough = Image.definition();

      var images = Image.create([
        { id: 1, gallery_id: 1, title: 'Amiga 1200' },
        { id: 2, gallery_id: 1, title: 'Srinivasa Ramanujan' },
        { id: 3, gallery_id: 1, title: 'Las Vegas' },
        { id: 4, gallery_id: 2, title: 'Silicon Valley' },
        { id: 5, gallery_id: 2, title: 'Unknown' }
      ], { type: 'set', exists: true });

      images = images.data();

      hasManyThrough.embed(images, 'tags', { fetchOptions: { 'return': 'object' } }).then(function() {

        expect(ImageTag.all).toHaveBeenCalledWith({
          conditions: { image_id: [1, 2, 3, 4, 5] }
        }, { 'return': 'object' });

        expect(Tag.all).toHaveBeenCalledWith({
          conditions: { id: [1, 3, 5, 6] }
        }, { 'return': 'object' });

        images.forEach(function(image) {
          image['images_tags'].forEach(function(image_tag, index) {
            expect(image_tag['tag']).toBe(image['tags'][index]);
            expect(image['tags'][index] instanceof Model).toBe(false);
          });
        });
        done();

      });

    });

  });

  describe(".get()", function() {

    it("throws an exception when a lazy load is necessary", function() {

      var closure = function() {
        var image = Image.create({ id: 1, gallery_id: 1, title: 'Amiga 1200' }, { exists: true });
        image.get('tags');
      };

      expect(closure).toThrow(new Error("The relation `'tags'` is an external relation, use `fetch()` to lazy load its data."));

    });

  });

  describe(".fetch()", function() {

    it("lazy loads a hasManyThrough relation", function(done) {

      co(function*()  {
        spyOn(ImageTag, 'all').and.callFake(function(options, fetchOptions) {
          var imagesTags =  ImageTag.create([
            { id: 1, image_id: 1, tag_id: 1 },
            { id: 2, image_id: 1, tag_id: 3 }
          ], { type: 'set', exists: true });
          return Promise.resolve(imagesTags);
        });

        spyOn(Tag, 'all').and.callFake(function(options, fetchOptions) {
          var tags =  Tag.create([
            { id: 1, name: 'High Tech' },
            { id: 3, name: 'Computer' }
          ], { type: 'set', exists: true });
          return Promise.resolve(tags);
        });

        var image = Image.create({ id: 1, gallery_id: 1, title: 'Amiga 1200' }, { exists: true });
        var tags = yield image.fetch('tags');

        expect(ImageTag.all).toHaveBeenCalledWith({ conditions: { image_id: 1 } }, {});
        expect(Tag.all).toHaveBeenCalledWith({ conditions: { id: [1, 3] } }, {});

        expect(tags.count()).toBe(2);
        expect(tags.get(0).data()).toEqual({ id: 1, name: 'High Tech' });
        expect(tags.get(1).data()).toEqual({ id: 3, name: 'Computer' });

        done();
      });

    });

  });

  describe(".save()", function() {

    it("bails out on save since it's just an alias", function(done) {

      var hasManyThrough = Image.definition().relation('tags');
      hasManyThrough.save().then(function() {
        done();
      });

    });

  });

});
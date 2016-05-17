import Gallery from '../../fixture/model/gallery';
import GalleryDetail from '../../fixture/model/gallery-detail';
import Image from '../../fixture/model/image';
import ImageTag from '../../fixture/model/image-tag';
import Tag from '../../fixture/model/tag';

describe("Relationship", function() {

  afterEach(function() {
    Gallery.reset();
    Image.reset();
  });

  describe(".counterpart()", function() {

    it("returns the counterpart relationship for belongsTo/hasMany relations", function() {

      var relation = Image.relation('gallery');
      expect(relation.counterpart()).toBe(Gallery.relation('images'));

      relation = Gallery.relation('images');
      expect(relation.counterpart()).toBe(Image.relation('gallery'));

    });

    it("returns the counterpart relationship for belongsTo/hasOne relations", function() {

      var relation = GalleryDetail.relation('gallery');
      expect(relation.counterpart()).toBe(Gallery.relation('detail'));

      relation = Gallery.relation('detail');
      expect(relation.counterpart()).toBe(GalleryDetail.relation('gallery'));

    });

    it("returns the counterpart relationship for hasMany/hasMany relations", function() {

      var relation = Image.relation('tags');
      expect(relation.counterpart()).toBe(Tag.relation('images'));

      relation = Tag.relation('images');
      expect(relation.counterpart()).toBe(Image.relation('tags'));

    });

    it("throws an exception when the counterpart is ambiguous", function() {

      var schema = Gallery.schema();

      schema.hasMany('images', Image, {
        keys: { id: 'gallery_id' }
      });
      schema.hasMany('photos', Image, {
        keys: { id: 'gallery_id' }
      });

      var closure = function() {
        var relation = Image.relation('gallery');
        relation.counterpart();
      };

      expect(closure).toThrow(new Error("Ambiguous belongsTo counterpart relationship for `Image`. Apply the Single Table Inheritance pattern to get unique models."));

    });

  });

});

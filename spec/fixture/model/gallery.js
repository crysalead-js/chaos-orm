var Model = require('../../../src/model');
var Relationship = require('../../../src/relationship');
var Image = require('./image');
var Tag = require('./tag');
var GalleryDetail = require('./gallery-detail');

class Gallery extends Model {
  static _define(schema) {
    schema.column('id', { type: 'serial' });
    schema.column('name', { type: 'string' });
    schema.column('tag_ids', { type: 'integer', array: true, format: 'json', use: 'json', default: '[]' });

    schema.hasOne('detail', 'GalleryDetail', { keys: { id: 'gallery_id' } });
    schema.hasMany('images', 'Image', { keys: { id: 'gallery_id' } });
    schema.hasMany('tags', 'Tag', {
      keys: { tag_ids: 'id' },
      link: Relationship.LINK_KEY_LIST
    });
  }
}

Gallery.register();

module.exports = Gallery;

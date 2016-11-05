var Model = require('../../../src/model');
var Image = require('./image');
var GalleryDetail = require('./gallery-detail');

class Gallery extends Model {
  static _define(schema) {
    schema.column('id', { type: 'serial' });
    schema.column('name', { type: 'string' });

    schema.hasOne('detail', 'GalleryDetail', { keys: { id: 'gallery_id' } });
    schema.hasMany('images', 'Image', { keys: { id: 'gallery_id' } });
  }
}

Gallery.register();

module.exports = Gallery;

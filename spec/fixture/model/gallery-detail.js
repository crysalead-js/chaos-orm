var Model = require('../../../src/model');
var Gallery = require('./gallery');

class GalleryDetail extends Model {
  static _define(schema) {
    schema.column('id', { type: 'serial' });
    schema.column('description', { type: 'string' });

    schema.belongsTo('gallery',  'Gallery', { keys: { gallery_id: 'id' } });
  }
}

GalleryDetail.register();

module.exports = GalleryDetail;

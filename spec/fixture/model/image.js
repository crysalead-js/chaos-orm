var Model = require('../../../src/model');
var ImageTag = require('./image-tag');
var Gallery = require('./gallery');

class Image extends Model {
  static _define(schema) {
    schema.column('id', { type: 'serial' });
    schema.column('name', { type: 'string' });
    schema.column('title', { type: 'string', length: 50 });
    schema.column('score', { type: 'float' });

    schema.belongsTo('gallery', 'Gallery', { keys: { gallery_id: 'id' } });
    schema.hasMany('images_tags', 'ImageTag', { keys: { id: 'image_id' } });
    schema.hasManyThrough('tags', 'images_tags', 'tag');
  }
}

Image.register();

module.exports = Image;

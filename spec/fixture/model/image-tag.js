var Model = require('../../../src/model');
var Image = require('./image');
var Tag = require('./tag');

class ImageTag extends Model {
  static _define(schema) {
    schema.column('id', { type: 'serial' });

    schema.belongsTo('image', 'Image', { keys: { image_id: 'id' } });
    schema.belongsTo('tag', 'Tag', { keys: { tag_id: 'id' } });
  }
}

ImageTag.register();

module.exports = ImageTag;

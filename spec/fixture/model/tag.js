var Model = require('../../../src/model');
var Image = require('./image');
var ImageTag = require('./image-tag');

class Tag extends Model {
  static _define(schema) {
    schema.column('id', { type: 'serial' });
    schema.column('name', { type: 'string', length: 50 });

    schema.hasMany('images_tags', 'ImageTag', { keys: { id: 'tag_id' } });
    schema.hasManyThrough('images', 'images_tags', 'image');
  }
}

Tag.register();

module.exports = Tag;

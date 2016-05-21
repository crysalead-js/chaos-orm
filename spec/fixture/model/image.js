import { Model } from '../../../src';
import ImageTag from './image-tag';
import Gallery from './gallery';

class Image extends Model {

  static _define(schema) {
    schema.column('id', { type: 'serial' });
    schema.column('gallery_id', { type: 'integer' });
    schema.column('name', { type: 'string' });
    schema.column('title', { type: 'string', length: 50 });
    schema.column('score', { type: 'float' });

    schema.belongsTo('gallery', 'Gallery', { keys: { gallery_id: 'id' } });
    schema.hasMany('images_tags', 'ImageTag', { keys: { id: 'image_id' } });
    schema.hasManyThrough('tags', 'images_tags', 'tag');
  }
}

Image.register();

export default Image;

import { Model } from '../../../src';
import ImageTag from './image-tag';
import Gallery from './gallery';

class Image extends Model {

  static _define(schema) {
    schema.set('id', { type: 'serial' });
    schema.set('gallery_id', { type: 'integer' });
    schema.set('name', { type: 'string' });
    schema.set('title', { type: 'string', length: 50 });
    schema.set('score', { type: 'float' });

    schema.belongsTo('gallery', 'Gallery', { keys: { gallery_id: 'id' } });
    schema.hasMany('images_tags', 'ImageTag', { keys: { id: 'image_id' } });
    schema.hasManyThrough('tags', 'images_tags', 'tag');
  }
}

Image.register();

export default Image;

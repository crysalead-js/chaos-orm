import { Model } from '../../..';
import ImageTag from './image-tag';
import Gallery from './gallery';

class Image extends Model {

  static _define(schema) {
    schema.set('id', { type: 'serial' });
    schema.set('gallery_id', { type: 'integer' });
    schema.set('name', { type: 'string' });
    schema.set('title', { type: 'string', length: 50 });

    schema.bind('gallery', {
      relation: 'belongsTo',
      to: Gallery,
      keys: { gallery_id: 'id' }
    });

    schema.bind('images_tags', {
      relation: 'hasMany',
      to: ImageTag,
      keys: { id: 'image_id' }
    });

    schema.bind('tags', {
      relation: 'hasManyThrough',
      through: 'images_tags',
      using: 'tag'
    });
  }
}

export default Image;

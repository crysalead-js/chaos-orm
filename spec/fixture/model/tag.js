import { Model } from '../../../src';
import Image from './image';
import ImageTag from './image-tag';

class Tag extends Model
{
  static _define(schema)
  {
    schema.set('id', { type: 'serial' });
    schema.set('name', { type: 'string', length: 50 });

    schema.bind('images_tags', {
      relation: 'hasMany',
      to: 'ImageTag',
      key: { id: 'tag_id' }
    });

    schema.bind('images', {
      relation: 'hasManyThrough',
      through: 'images_tags',
      using: 'image'
    });
  }
}

Tag.register();

export default Tag;


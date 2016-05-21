import { Model } from '../../../src';
import Image from './image';
import ImageTag from './image-tag';

class Tag extends Model
{
  static _define(schema)
  {
    schema.column('id', { type: 'serial' });
    schema.column('name', { type: 'string', length: 50 });

    schema.hasMany('images_tags', 'ImageTag', { keys: { id: 'tag_id' } });
    schema.hasManyThrough('images', 'images_tags', 'image');
  }
}

Tag.register();

export default Tag;


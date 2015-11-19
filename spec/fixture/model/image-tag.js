import { Model } from '../../../src';
import Image from './image';
import Tag from './tag';

class ImageTag extends Model {

  static _define(schema) {
    schema.set('id', { type: 'serial' });
    schema.set('image_id', { type: 'integer' });
    schema.set('tag_id', { type: 'integer' });

    schema.bind('image', {
      relation: 'belongsTo',
      to: Image,
      keys: { image_id: 'id' }
    });

    schema.bind('tag', {
      relation: 'belongsTo',
      to: Tag,
      keys: { tag_id: 'id' }
    });
  }
}

export default ImageTag;
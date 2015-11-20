import { Model } from '../../../src';
import Image from './image';
import Tag from './tag';

class ImageTag extends Model {

  static _define(schema) {
    schema.set('id', { type: 'serial' });
    schema.set('image_id', { type: 'integer' });
    schema.set('tag_id', { type: 'integer' });

    schema.belongsTo('image', 'Image', { keys: { image_id: 'id' } });
    schema.belongsTo('tag', 'Tag', { keys: { tag_id: 'id' } });
  }
}

ImageTag.register();

export default ImageTag;
import { Model } from '../../../src';
import Image from './image';
import Tag from './tag';

class ImageTag extends Model {

  static _define(schema) {
    schema.column('id', { type: 'serial' });
    schema.column('image_id', { type: 'integer' });
    schema.column('tag_id', { type: 'integer' });

    schema.belongsTo('image', 'Image', { keys: { image_id: 'id' } });
    schema.belongsTo('tag', 'Tag', { keys: { tag_id: 'id' } });
  }
}

ImageTag.register();

export default ImageTag;
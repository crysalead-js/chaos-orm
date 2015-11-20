import { Model } from '../../../src';
import Gallery from './gallery';

class GalleryDetail extends Model {

  static _define(schema) {
    schema.set('id', { type: 'serial' });
    schema.set('description', { type: 'string' });
    schema.set('gallery_id', { type: 'integer' });

    schema.bind('gallery', {
      relation: 'belongsTo',
      to: 'Gallery',
      keys: { gallery_id: 'id' }
    });
  }
}

GalleryDetail.register();

export default GalleryDetail;

import { Model } from '../../../src';
import Gallery from './gallery';

class GalleryDetail extends Model {
  static _define(schema) {
    schema.column('id', { type: 'serial' });
    schema.column('description', { type: 'string' });

    schema.belongsTo('gallery',  'Gallery', { keys: { gallery_id: 'id' } });
  }
}

GalleryDetail.register();

export default GalleryDetail;

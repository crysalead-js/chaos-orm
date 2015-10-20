import Model from '../../../src/model';
import Image from './image';
import GalleryDetail from './gallery-detail';

class Gallery extends Model {

  static _define(schema) {
    schema.set('id', { type: 'serial' });
    schema.set('name', { type: 'string' });

    schema.bind('detail', {
      relation: 'hasOne',
      to: GalleryDetail,
      keys: { id: 'gallery_id' }
    });

    schema.bind('images', {
      relation: 'hasMany',
      to: Image,
      keys: { id: 'gallery_id' }
    });
  }

}

export default Gallery;
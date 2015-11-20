import { Model } from '../../../src';
import Image from './image';
import GalleryDetail from './gallery-detail';

class Gallery extends Model {

  static _define(schema) {
    schema.set('id', { type: 'serial' });
    schema.set('name', { type: 'string' });

    schema.hasOne('detail', 'GalleryDetail', { keys: { id: 'gallery_id' } });
    schema.hasMany('images', 'Image', { keys: { id: 'gallery_id' } });
  }
}

Gallery.register();

export default Gallery;
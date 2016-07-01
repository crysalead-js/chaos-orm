import co from 'co';
import { extend, merge } from 'extend-merge';
import Relationship from '../relationship';
import Model from '../model';

/**
 * The `HasOne` relationship.
 */
class HasOne extends Relationship {

  /**
   * Expands a collection of entities by adding their related data.
   *
   * @param  mixed      collection The collection to expand.
   * @param  Object     options    The embedging options.
   * @return Collection            The collection of related entities.
   */
  embed(collection, options) {
    return co(function*() {
      var indexes = this._index(collection, this.keys('from'));
      options = merge({}, { fetchOptions: { collector: this._collector(collection) } }, options);

      var related = yield this._find(Object.keys(indexes), options);
      var name = this.name();
      var value;
      this._cleanup(collection);

      related.forEach(function(entity, index) {
        if (entity instanceof Model) {
          value = entity.get(this.keys('to'));
          if (indexes[value] !== undefined) {
            if (Array.isArray(collection)) {
              collection[indexes[value]].set(name, entity);
            } else {
              collection.get(indexes[value]).set(name, entity);
            }
          }
        } else {
          value = entity[this.keys('to')];
          if (indexes[value] !== undefined) {
            if (Array.isArray(collection)) {
              collection[indexes[value]][name] = entity;
            } else {
              collection.get(indexes[value])[name] = entity;
            }
          }
        }
      }.bind(this));
      return related;
    }.bind(this));
  }

  /**
   * Saves a relation.
   *
   * @param  Object  entity  The relation's entity
   * @param  Object  options Saving options.
   * @return Promise
   */
  save(entity, options) {
    return co(function*() {
      if (this.link() !== this.constructor.LINK_KEY) {
        return true;
      }

      var name = this.name();
      if (!entity.has(name)) {
        return true;
      }

      var conditions = this.match(entity);
      var related = entity.get(name);
      return yield related.set(conditions).save(options);
    }.bind(this));
  }
}

export default HasOne;

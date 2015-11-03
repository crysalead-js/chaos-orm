import {extend, merge} from 'extend-merge';
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
    var Promise = this.from().classes().promise;
    return new Promise(function(resolve, reject) {
      var indexes = this._index(collection, this.keys('from'));
      options = extend({}, { fetchOptions: { collector: this._collector(collection) } }, options);

      this._find(Object.keys(indexes), options).then(function(related) {
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
        resolve(related);
      }.bind(this));
    }.bind(this));
  }

  /**
   * Saves a relation.
   *
   * @param  Object  entity  The relation's entity
   * @param  Object  options Saving options.
   * @return Boolean
   */
  save(entity, options) {
    var Promise = this.from().classes().promise;
    return new Promise(function(resolve, reject) {
      if (this.link() !== this.constructor.LINK_KEY) {
        resolve(entity);
        return;
      }

      var name = this.name();
      if (!entity.isset(name)) {
        resolve(entity);
        return;
      }

      var conditions = this.match(entity);
      var related = entity.get(name);
      related.set(conditions).save(options).then(function() {
        resolve(entity);
      }, function() {
        reject("Unable to save some `HasOne` related data.");
      });
    }.bind(this));
  }
}

export default HasOne;

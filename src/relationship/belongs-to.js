import {extend, merge} from 'extend-merge';
import Relationship from '../relationship';
import Model from '../model';

/**
 * The `BelongsTo` relationship.
 */
class BelongsTo extends Relationship {
  /**
   * Constructs an object that represents a relationship between two model classes.
   *
   * @see Relationship
   */
  constructor(config) {
    var hasKeys = config && config.keys;
    super(config);

    if (!hasKeys) {
      this._keys = {};
      var primaryKey = this.conventions().apply('primaryKey');
      this._keys[this.conventions().apply('foreignKey', config.from.name)] = primaryKey;
    }
  }

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

      this._find(Object.keys(indexes), options).then(function(related) {;
        var name = this.name();
        var value;

        indexes = this._index(related, this.keys('to'));
        this._cleanup(collection);

        collection.forEach(function(entity, index) {
          if (entity instanceof Model) {
            value = entity.get(this.keys('from'));
            if (indexes[value] !== undefined) {
              entity.set(name, Array.isArray(related) ? related[indexes[value]] : related.get(indexes[value]));
            }
          } else {
            value = entity[this.keys('from')];
            if (indexes[value] !== undefined) {
              entity[name] = Array.isArray(related) ? related[indexes[value]] : related.get(indexes[value]);
            }
          }
        }.bind(this));
        resolve(related);
      }.bind(this))
    }.bind(this));
    return related;
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

      var related = entity.get(name);

      related.save(options).then(function(){

        var keys = this.keys();
        var from = this.keys('from');
        var to = this.keys('to');

        var conditions = {};
        if (!related.isset(to)) {
          reject("The `'" + to + "'` key is missing from related data.");
          return;
        }
        conditions[from] = related.get(to);

        entity.set(conditions);
        resolve(entity);
      }.bind(this), function() {
        reject("Unable to save some `BelongsTo` related data.");
      });
    }.bind(this));
  }
}

export default BelongsTo;
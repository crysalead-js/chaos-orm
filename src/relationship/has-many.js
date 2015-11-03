import {extend, merge} from 'extend-merge';
import Relationship from '../relationship';
import Model from '../model';

/**
 * The `HasMany` relationship.
 */
class HasMany extends Relationship {
  /**
   * Constructs an object that represents a relationship between two model classes.
   *
   * @see chaos\Relationship
   * @param array $config The relationship's configuration, which defines how the two models in
   *                      question are bound. The available options are:
   *                      - `'junction'` _boolean_ : Indicates whether the relation is a junction table or not.
   *                                                 If `true`, associative entities are removed when unsetted.
   *                                                 All `hasMany` relations used aby an `hasManyThrough` relation will
   *                                                 have their junction attribute set to `true`. Default to `false`.
   */
  constructor(config) {
    var defaults = {
      junction: false
    };

    config = extend({}, defaults, config);
    super(config);

    /**
     * Indicates whether the relation is a junction table or not.
     *
     * @var Boolean
     */
    this._junction = config.junction;
  }

  /**
   * Sets the behavior of associative entities. If a hasMany relation is marked as a "junction table",
   * associative entities will be removed once a foreign key is unsetted. When a hasMany relation is
   * not marked as a "junction table", associative entities will simply have their foreign key unsetted.
   *
   * @param  Boolean value The junction value to set or none to get it.
   * @return Abject           Returns `this` on set and the junction value on get.
   */
  junction(value) {
    if (arguments.length) {
      this._junction = value;
      return this;
    }
    return this._junction;
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

      this._find(Object.keys(indexes), options).then(function(related) {
        var name = this.name();
        var value;

        this._cleanup(collection);

        related.forEach(function(entity, index) {
          if (entity instanceof Model) {
            value = entity.get(this.keys('to'));
            if (indexes[value] !== undefined) {
              if (Array.isArray(collection)) {
                collection[indexes[value]].get(name).push(entity);
              } else {
                collection.get(indexes[value]).get(name).push(entity);
              }
            }
          } else {
            value = entity[this.keys('to')];
            if (indexes[value] !== undefined) {
              if (Array.isArray(collection)) {
                collection[indexes[value]][name].push(entity);
              } else {
                collection.get(indexes[value])[name].push(entity);
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
      var to = this.to();
      to.all({ conditions: conditions }).then(function(previous){

        var indexes = this._index(previous, this.keys('from'));
        var result = true;
        var collection = entity.get(name);

        collection.forEach(function(item, index) {
          if (item.exists() && indexes[item.primaryKey()]) {
            previous.unset(indexes[item.primaryKey()]);
          }
          item.set(conditions);
          result = result && item.save(options);
        });

        var junction = this.junction(), promises = [];

        if (junction) {
          previous.forEach(function(item, index) {
            promises.push(item.delete());
          });
        } else {
          var toKey = this.keys('to');
          previous.forEach(function(item, index) {
            item.unset(toKey);
            promises.push(item.save());
          });
        }
        Promise.all(promises).then(function() {
          resolve(entity);
        }, function(err) {
          reject("Unable to remove `'" + toKey + "'` attachments of an entity.");
        });

      }.bind(this), function() {
        reject("Error loading current `'hasMany'` attachments.");
      });

    }.bind(this));
  }
}

export default HasMany;

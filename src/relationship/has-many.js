import co from 'co';
import { extend, merge } from 'extend-merge';
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
      if (!entity.isset(name)) {
        return true;
      }

      var conditions = this.match(entity);
      var to = this.to();
      var previous = yield to.all({ conditions: conditions });
      var existing = {};

      var indexes = this._index(previous, this.keys('from'));
      var result = true;
      var collection = entity.get(name);
      var success = true;

      for (var item of collection) {
        if (item.exists() && indexes[item.id()] !== undefined) {
          existing[indexes[item.id()]] = true;
        }
        item.set(conditions);
        var ok = yield item.save(options);
        success = success && ok;
      }

      var junction = this.junction(), promises = [];

      if (junction) {
        previous.forEach(function (item, index) {
          if (!existing[index]) {
            promises.push(item.delete());
          }
        });
      } else {
        var toKey = this.keys('to');
        previous.forEach(function (item, index) {
          if (!existing[index]) {
            item.unset(toKey);
            promises.push(item.save());
          }
        });
      }
      yield* promises;
      return success;

    }.bind(this));
  }
}

export default HasMany;

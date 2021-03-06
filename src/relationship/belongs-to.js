var co = require('co');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var Relationship = require('../relationship');
var Model = require('../model');

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
      var key = this.conventions().apply('key');
      this._keys = {[this.conventions().apply('reference', config.to.name)]: key};
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
    return co(function*() {
      var indexes = this._index(collection, this.keys('from'));

      var related = yield this._find(Object.keys(indexes), options);
      var name = this.name();
      var value;

      indexes = this._index(related, this.keys('to'));
      this._cleanup(collection);

      collection.forEach(function(entity, index) {
        if (entity instanceof Model) {
          value = String(entity.get(this.keys('from')));
          if (indexes[value] !== undefined) {
            entity.set(name, Array.isArray(related) ? related[indexes[value]] : related.get(indexes[value]));
          }
        } else {
          value = String(entity[this.keys('from')]);
          if (indexes[value] !== undefined) {
            entity[name] = Array.isArray(related) ? related[indexes[value]] : related.get(indexes[value]);
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

      var related = entity.get(name);

      var result = yield related.save(options);

      var keys = this.keys();
      var from = this.keys('from');
      var to = this.keys('to');

      var conditions = {};
      if (!related.has(to)) {
        throw new Error ("The `'" + to + "'` key is missing from related data.");
      }
      conditions[from] = related.get(to);

      entity.set(conditions);

      return result;
    }.bind(this));
  }
}

module.exports = BelongsTo;
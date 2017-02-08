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

      var related = yield this._find(Array.from(indexes.keys()), options);
      var name = this.name();
      var value;

      indexes = this._index(related, this.keys('to'));
      this._cleanup(collection);

      collection.forEach(function(entity, index) {
        if (entity instanceof Model) {
          value = entity.get(this.keys('from'));
          if (indexes.has(value)) {
            entity.set(name, Array.isArray(related) ? related[indexes.get(value)] : related.get(indexes.get(value)));
          }
        } else {
          value = entity[this.keys('from')];
          if (indexes.has(value)) {
            entity[name] = Array.isArray(related) ? related[indexes.get(value)] : related.get(indexes.get(value));
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
  broadcast(entity, options) {
    return co(function*() {
      if (this.link() !== this.constructor.LINK_KEY) {
        return true;
      }

      var name = this.name();
      if (!entity.has(name)) {
        return true;
      }

      var related = entity.get(name);

      yield related.broadcast(options);

      var keys = this.keys();
      var from = this.keys('from');
      var to = this.keys('to');

      var conditions = {};
      if (!related.has(to)) {
        throw new Error ("The `'" + to + "'` key is missing from related data.");
      }
      conditions[from] = related.get(to);

      entity.set(conditions);
    }.bind(this));
  }
}

module.exports = BelongsTo;
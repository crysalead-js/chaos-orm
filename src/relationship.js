var co = require('co');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var Conventions = require('./conventions');
var Model= require('./model');

/**
 * The `Relationship` class encapsulates the data and functionality necessary to link two model together.
 */
class Relationship {
  /**
   * Constructs an object that represents a relationship between two model classes.
   *
   * @param Object config The relationship's configuration, which defines how the two models in
   *                      question are bound. The available options are:
   *                      - `'name'`        _string_ : The field name used for accessing the related data.
   *                                                   For example, in the case of `Post` hasMany `Comment`, the name could be `'comments'`.
   *                      - `'keys'`        _mixed_  : Mathing keys definition, where the key is the key in the originating model,
   *                                                   and the value is the key in the target model (i.e. `['fromId' => 'toId']`).
   *                      - `'from'`        _string_ : The fully namespaced class name this relationship originates.
   *                      - `'to'`          _string_ : The fully namespaced class name this relationship targets.
   *                      - `'link'`        _string_ : A constant specifying how the object bound to the originating
   *                                                   model is linked to the object bound to the target model. For relational
   *                                                   databases, the only valid value is `LINK_KEY`, which means a foreign
   *                                                   key in one object matches another key (usually the primary key) in the other.
   *                                                   For document-oriented and other non-relational databases, different types of
   *                                                   linking, including key lists or even embedding.
   *                      - `'fields'`      _mixed_  : An array of the subset of fields that should be selected
   *                                                   from the related object(s) by default. If set to `true` (the default), all
   *                                                   fields are selected.
   *                      - `'embedded'`    _boolean_: Indicates if the relation is embedded or not.
   *                      - `'conventions'` _object_ : The naming conventions instance to use.
   */
  constructor(config) {
    var defaults = {
      name: '',
      keys: undefined,
      from: undefined,
      to: undefined,
      link: this.constructor.LINK_KEY,
      fields: true,
      embedded: false,
      conventions: undefined
    };

    config = extend({}, defaults, config);

    if (!config.from) {
      throw new Error("The relationship `'from'` option can't be empty.");
    }

    if (!config.to) {
      throw new Error("The relationship `'to'` option can't be empty.");
    }

    /**
     * The naming conventions instance to use.
     *
     * @var Object
     */
    this._conventions = config.conventions ? config.conventions : new Conventions();

    if (!config.keys) {
      var key = this._conventions.apply('key');
      config.keys = {};
      config.keys[key] = this._conventions.apply('reference', config.from.name);
    }

    if (!config.name) {
      config.name = this._conventions.apply('field', config.to.name);
    }

    /**
     * The relation/field name.
     *
     * @var String
     */
    this._name = config.name;

    /**
     * The fully namespaced class name this relationship originates.
     *
     * @var String
     */
    this._from = config.from;

    /**
     * The fully namespaced class name this relationship targets.
     *
     * @var String
     */
    this._to = config.to;

    /**
     * Mathing keys definition.
     *
     * @var Array
     */
    this._keys = config.keys;

    /**
     * The type of linking.
     *
     * @var String
     */
    this._link = config.link;

    /**
     * The field names to filter on.
     *
     * @var mixed
     */
    this._fields = config.fields;

    /**
     * The embedded mode.
     *
     * @var boolean
     */
    this._embedded = config.embedded;

    /**
     * The counterpart relation.
     *
     * @var String
     */
    this._counterpart = undefined;

    /**
     * The type of relationship.
     *
     * @var String
     */
    var lower = this.constructor.name.charAt(0).toLowerCase();
    this._type = lower + this.constructor.name.substr(1);
  }

  /**
   * Returns the convention instance.
   *
   * @return Object
   */
  conventions() {
    return this._conventions;
  }

  /**
   * Returns the field name.
   *
   * @return String
   */
  name() {
    return this._name;
  }

  /**
   * Returns the origin model.
   *
   * @return Function
   */
  from() {
    return this._from;
  }

  /**
   * Returns the target model.
   *
   * @return Function
   */
  to() {
    return this._to;
  }

  /**
   * Returns the counterpart relation.
   *
   * @return object
   */
  counterpart() {
      if (this._counterpart) {
          return this._counterpart;
      }

      var rel;
      var to = this.to();

      var from = this.from();
      var relations = to.definition().relations();
      var result = [];

      for(var relation of relations) {
        rel = to.definition().relation(relation);
        if (rel.to() === this.from()) {
          result.push(rel);
        }
      }
      if (result.length === 1) {
        return this._counterpart = result[0];
      } else if (result.length > 1) {
          throw new Error('Ambiguous ' + this.type() + ' counterpart relationship for `' + from.name + '`. Apply the Single Table Inheritance pattern to get unique models.');
      }
      throw new Error('Missing ' + this.type() + ' counterpart relationship for `' + from.name + '`. Add one in the `' + to.name + '` model.');
  }

  /**
   * Returns the "primary key/foreign key" matching definition. The key corresponds
   * to field name in the source model and the value is the one in the target model.
   *
   * @param  mixed type An optionnal type to get.
   * @return mixed      Returns "primary key/foreign key" matching definition array or
   *                    a specific one if `type` is provided.
   */
  keys(type) {
    if (!arguments.length) {
      return this._keys;
    }
    if (type === 'from') {
      return Object.keys(this._keys)[0];
    } else if (type === 'to') {
      return this._keys[Object.keys(this._keys)[0]];
    }
    throw new Error("Invalid type `'" + type + "'` only `'from'` and `'to'` are available");
  }

  /**
   * Returns the link type.
   *
   * @return String
   */
  link() {
    return this._link;
  }

  /**
   * Returns the fields.
   *
   * @return mixed
   */
  fields() {
    return typeof this._fields === 'boolean' ? this._fields : this._fields.splice();
  }

  /**
   * Returns the embedded value.
   *
   * @return boolean
   */
  embedded() {
    return this._embedded;
  }

  /**
   * Returns the relationship type.
   *
   * @return String
   */
  type() {
    return this._type;
  }

  /**
   * Generates the matching conditions for a related object (or objects) for the given object
   * connected to it by this relationship.
   *
   * @param  Object entity The entity or collection object to get the related data from.
   * @return Object        Returns a conditions array.
   */
  match(entity) {
    var from = this.keys('from');
    var to = this.keys('to');

    var conditions = {};
    if (!entity.has(from)) {
      throw new Error("The `'" + from + "'` key is missing from entity data.");
    }
    conditions[to] = entity.get(from);
    return conditions;
  }

  // /**
  //  * Gets the related data.
  //  *
  //  * @param  Object entity An entity.
  //  * @return               The related data.
  //  */
  // get(entity, options) {
  //   return co(function*() {
  //     var name = this.name();
  //     yield entity.sync();

  //     if (!entity.exists()) {
  //       return entity.schema().cast(name, {}, { parent: entity });
  //     }

  //     var link = this.link();
  //     var strategies = this.strategies();

  //     if (!strategies[link] || typeof strategies[link] !== 'function') {
  //         throw new Error("Attempted to get object for invalid relationship link type `'" + link + "'`.");
  //     }
  //     return yield strategies[link](entity, this, options);
  //   }.bind(this));
  // }

  // /**
  //  * Strategies used to query related objects.
  //  */
  // strategies() {
  //   var strategies = {};

  //   strategies[this.constructor.LINK_EMBEDDED] = function(entity, relationship, options) {
  //     return Promise.resolve(entity.get(relationship.name()));
  //   };

  //   strategies[this.constructor.LINK_CONTAINED] = function(entity, relationship, options) {
  //     return Promise.resolve(relationship.isMany() ? entity.parent().parent() : entity.parent());
  //   };

  //   strategies[this.constructor.LINK_KEY] = function(entity, relationship, options) {
  //     return new Promise(function(resolve, reject) {
  //       var collection;
  //       if (relationship.type() === 'hasManyThrough') {
  //         collection = [entity];
  //         this.embed(collection, options).then(function() {
  //           resolve(entity.get(relationship.name()));
  //         }, function() {
  //           throw new Error("Unable to get the related relationship data.")
  //         });
  //         return;
  //       }
  //       this._find(entity.get(relationship.keys('from')), options).then(function(collection) {
  //         if (relationship.isMany()) {
  //           resolve(collection);
  //         }
  //         resolve(collection.length ? collection.get(0) : undefined);
  //       }, function() {
  //         throw new Error("Unable to get the related relationship data.")
  //       });
  //     }.bind(this), function(error) {
  //       reject(error);
  //     });

  //   }.bind(this);

  //   strategies[this.constructor.LINK_KEY_LIST] = function(object, relationship, options) {
  //     return this._find(entity.get(relationship.keys('from')), options);
  //   }.bind(this);

  //   return strategies;
  // }

  /**
   * Get a related object (or objects) for the given object connected to it by this relationship.
   *
   * @return Boolean Returns `true` if the relationship is a `'hasMany'` or `'hasManyThrough`' relation,
   *                 returns `false` otherwise.
   */
  isMany() {
    return /Many/.test(this.constructor.name);
  }

  /**
   * Gets all entities attached to a collection en entities.
   *
   * @param  mixed  id An id or an array of ids.
   * @return Object    A collection of items matching the id/ids.
   */
  _find(id, options) {
    var defaults = {
      query: {},
      fetchOptions: {}
    };
    options = extend({}, defaults, options);

    var fetchOptions = options.fetchOptions;
    delete options.fetchOptions;

    if (this.link() !== this.constructor.LINK_KEY) {
      throw new Error("This relation is not based on a foreign key.");
    }
    var to = this.to();
    var schema = to.definition();

    if (id == null || (Array.isArray(id) && !id.length)) {
      return Promise.resolve(to.create([], { type: 'set' }));
    }

    var ids = Array.isArray(id) ? id : [id];
    var key = schema.key();
    var column = schema.column(key);

    for (var i = 0, len = ids.length; i < len; i++) {
      ids[i] = schema.convert('cast', column.type, ids[i], column);
    }

    if (ids.length === 1) {
      ids = ids[0];
    }
    var query, defaultQuery = { conditions: {} };

    defaultQuery.conditions[this.keys('to')] = ids;
    query = extend({}, defaultQuery, options.query);
    return to.all(query, fetchOptions);
  }

  /**
   * Indexes a collection.
   *
   * @param  mixed  $collection An collection to extract index from.
   * @param  String $name       The field name to build index for.
   * @return Object             An array of indexes where keys are `$name` values and
   *                            values the corresponding index in the collection.
   */
  _index(collection, name) {
    var indexes = {}, value;
    collection.forEach(function(entity, i) {
      value = entity instanceof Model ? entity.get(name) : entity[name];
      if (value != null) {
        indexes[String(value)] = i;
      }
    });
    return indexes;
  }

  /**
   * Unsets the relationship attached to a collection en entities.
   *
   * @param  mixed  $collection An collection to "clean up".
   */
  _cleanup(collection) {
    var name = this.name();

    if (this.isMany()) {
      collection.forEach(function(entity) {
        if (entity instanceof Model) {
          entity.set(name, []);
        } else {
          entity[name] = [];
        }
      });
      return;
    }

    collection.forEach(function(entity) {
      if (entity instanceof Model) {
        entity.unset(name);
      } else {
        delete entity[name];
      }
    });
  }

  /**
   * Check if an entity is valid or not.
   *
   * @param  Object  entity  The relation's entity.
   * @param  Object  options The validation options.
   * @return Promise
   */
  validates(entity, options) {
    var name = this.name();
    return co(function*() {
      var fieldname = name;
      if (!entity.has(fieldname)) {
        return true;
      }
      return entity.get(fieldname).validates(options);
    });
  }
}

/**
 * A one-to-one or many-to-one relationship in which a key contains an ID value linking to
 * another document or record.
 */
Relationship.LINK_KEY = 'key';

/**
 * A many-to-many relationship in which a key contains an embedded array of IDs linking to other
 * records or documents.
 */
Relationship.LINK_KEY_LIST = 'keylist';

/**
 * A relationship linking type defined by one document or record (or multiple) being embedded
 * within another.
 */
Relationship.LINK_EMBEDDED = 'embedded';

/**
 * The reciprocal of `LINK_EMBEDDED`, this defines a linking type wherein an embedded document
 * references the document that contains it.
 */
Relationship.LINK_CONTAINED = 'contained';

module.exports = Relationship;
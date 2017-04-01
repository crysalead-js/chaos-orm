var co = require('co');
var dotpath = require('dotpath-parser');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var expand = require('expand-flatten').expand;
var flatten = require('expand-flatten').flatten;
var Validator = require('chaos-validator').Validator;
var Document = require('./document');
var Conventions = require('./conventions');
var Collection = require('./collection/collection');
var Through = require('./collection/through');

class Model extends Document {

  /**
   * Gets/sets the connection object to which this model is bound.
   *
   * @param  Object $connection The connection instance to set or nothing to get the current one.
   * @return Object             Returns a connection instance.
   */
  static connection(connection) {
    if (arguments.length) {
      this._connection = connection;
      Model._definitions.delete(this);
      return this;
    }
    return this._connection;
  }

  /**
   * Gets/sets the validator instance.
   *
   * @param  Object validator The validator instance to set or none to get it.
   * @return mixed            The validator instance on get.
   */
  static validator(validator) {
    if (arguments.length) {
      Model._validators[this.name] = validator;
      return;
    }

    if (Model._validators[this.name]) {
      return Model._validators[this.name];
    }
    var classname = this.classes().validator;
    var validator = Model._validators[this.name] = new classname();
    this._rules(validator);
    return validator;
  }

  /**
   * Gets/sets the default query parameters used on finds.
   *
   * @param  Object query The query parameters.
   * @return Object       Returns the default query parameters.
   */
  static query(query) {
    if (arguments.length) {
      this._query[this.name] = query || {};
    }
    return this._query[this.name] ? this._query[this.name] : {};
  }

  /**
   * Gets/sets the schema definition of the model.
   *
   * @param  Object schema The schema instance to set or none to get it.
   * @return Object        The schema instance.
   */
  static definition(schema) {
    if (arguments.length) {
      if (typeof schema === 'function') {
        this._definition = schema;
      } else if (schema) {
        Model._definitions.set(this, schema);
      } else {
        Model._definitions.delete(this);
      }
      return this;
    }
    if (Model._definitions.has(this)) {
      return Model._definitions.get(this);
    }

    var config = {
      conventions: this.conventions(),
      connection: this._connection,
      class: this
    };

    config.source = this.conventions().apply('source', this.name);

    var schema = new this._definition(config);
    Model._definitions.set(this, schema);
    this._define(schema);
    return schema;
  }

  /**
   * Get/set the unicity value.
   *
   * @param  Boolean      $enable The unicity value or none to get it.
   * @return Boolean|self         The unicity value on get and `this` on set.
   */
  static unicity(enable) {
    if (!arguments.length) {
      return this._unicity;
    }
    this._unicity = !!enable;
  }

  /**
   * Get the shard attached to the model.
   *
   * @param  Object collector The collector instance to set or none to get it.
   * @return Object           The collector instance on get and `this` on set.
   */
  static shard(collector) {
    if (arguments.length) {
      if (collector) {
        Model._shards.set(this, collector);
      } else {
        Model._shards.delete(this);
      }
      return this;
    }
    if (!Model._shards.has(this)) {
      Model._shards.set(this, new Map());
    }
    return Model._shards.get(this);
  }

  /**
   * This function called once for initializing the model's schema.
   *
   * Example of schema initialization:
   * ```php
   * schema.column('id', { type: 'id' });
   *
   * schema.column('title', { type: 'string', 'default': true });
   *
   * schema.column('body', { type: 'string' });
   *
   * // Custom object
   * schema.column('comments',       { type: 'object', array: true, 'default': [] });
   * schema.column('comments.id',    { type: 'id' });
   * schema.column('comments.email', { type: 'string' });
   * schema.column('comments.body',  { type: 'string' });
   *
   * // Custom object with a dedicated class
   * schema.column('comments', {
   *    type: 'entity',
   *    class: Comment,
   *    array: true,
   *    default: []
   * });
   *
   * schema.hasManyThrough('tags', 'post_tag', 'tag');
   *
   * schema.hasMany('post_tag', PostTag, { keys: { id: 'post_id' } });
   * ```
   *
   * @param Object $schema The schema instance.
   */
  static _define(schema) {
  }

  /**
   * This function is called once for initializing the validator instance.
   *
   * @param Object validator The validator instance.
   */
  static _rules(validator) {
  }

  /**
   * Instantiates a new record or document object, initialized with any data passed in. For example:
   *
   * ```php
   * var post = Post.create({ title: 'New post' });
   * echo post.get('title'); // echoes 'New post'
   * var success = post.save();
   * ```
   *
   * Note that while this method creates a new object, there is no effect on the database until
   * the `save()` method is called.
   *
   * In addition, this method can be used to simulate loading a pre-existing object from the
   * database, without actually querying the database:
   *
   * ```php
   * var post = Post.create({ id: id, moreData: 'foo' }, { exists: true });
   * post.set('title', 'New title');
   * var success = post.save();
   * ```
   *
   * @param  Object data    Any data that this object should be populated with initially.
   * @param  Object options Options to be passed to item.
   *                        - `'type'`  _String_   : can be `'entity'` or `'set'`. `'set'` is used if the passed data represent a collection
   *                                                     of entities. Default to `'entity'`.
   *                        - `'class'` _Function_ : the class document to use to create entities.
   * @return Object         Returns a new, un-saved record or document object. In addition to
   *                        the values passed to `data`, the object will also contain any values
   *                        assigned to the `'default'` key of each field defined in the schema.
   */
  static create(data, options) {
    var defaults = {
      type: 'entity',
      class: this,
      exists: false
    };

    options = extend({}, defaults, options);

    var type = options.type;
    var classname = options.class;

    if (type === 'entity' && options.exists !== false && classname.unicity()) {
      data = data || {};
      var schema = classname.definition();
      var shard = classname.shard();
      var key = classname.definition().key();
      var id = data[key];
      if (id != null && shard.has(id)) {
        var instance = shard.get(id);
        instance.amend(data, { exists: options.exists, rebuild: true });
        return instance;
      }
    }
    return super.create(data, options);
  }

  /**
   * Finds a record by its primary key.
   *
   * @param  Object  options Options for the query.
   *                         -`'conditions'` : The conditions array.
   *                         - other options depend on the ones supported by the query instance.
   *
   * @return Object          An instance of `Query`.
   */
  static find(options) {
    options = extend({}, this.query(), options);
    return this.definition().query({ query: options });
  }

  /**
   * Finds all records matching some conditions.
   *
   * @param  Object options      Options for the query.
   * @param  Object fetchOptions The fecthing options.
   * @return mixed               The result.
   */
  static all(options, fetchOptions) {
    return this.find(options).all(fetchOptions);
  }

  /**
   * Finds the first record matching some conditions.
   *
   * @param  Object options      Options for the query.
   * @param  Object fetchOptions The fecthing options.
   * @return mixed               The result.
   */
  static first(options, fetchOptions) {
    return this.find(options).first(fetchOptions);
  }

  /**
   * Finds a record by its ID.
   *
   * @param  mixed id            The id to retreive.
   * @param  Object fetchOptions The fecthing options.
   * @return mixed               The result.
   */
  static load(id, options, fetchOptions) {
    options = extend({}, { conditions: {} }, options);
    options.conditions[this.definition().key()] = id;
    return this.first(options, fetchOptions);
  }

  /**
   * Resets the Model.
   */
  static reset() {
    this.classes({});
    this.conventions(undefined);
    this.connection(undefined);
    this.definition(undefined);
    this.validator(undefined);
    this.query({});
    if (this === Model) {
      this._unicity = false;
    } else {
      delete this._unicity;
    }
    Model._definitions.delete(this);
    Model._shards.delete(this);
  }

  /***************************
   *
   *  Entity related methods
   *
   ***************************/
  /**
   * Creates a new record object with default values.
   *
   * @param array $config Possible options are:
   *                      - `'exists'`     _boolean_: A boolean or `null` indicating if the entity exists.
   *
   */
  constructor(config) {
    var defaults = {
      exists: false
    };
    config = extend({}, defaults, config);
    delete config.basePath;

    super(config);

    if (this._exists !== true) {
      return;
    }
    var id = this.id();
    if (!id) {
      throw new Error("Existing entities must have a valid ID.");
    }
    if (!this.constructor.unicity()) {
      return;
    }
    var shard = this.constructor.shard();
    if (shard.has(id)) {
      var source = this.constructor.definition().source();
      throw new Error("Trying to create a duplicate of `" + source + "` ID `" + String(id) + "` which is not allowed when unicity is enabled.");
    }
    shard.set(id, this);
  }

  /**
   * Returns a string representation of the instance.
   *
   * @return String
   */
  title() {
    return this._data.title ? this._data.title : this._data.name;
  }

  /**
   * Returns the primary key value.
   *
   * @return mixed     The primary key value.
   */
  id() {
    var key = this.schema().key();
    if (!key) {
      throw new Error("No primary key has been defined for `" + this.constructor.name + "`'s schema.");
    }
    return this.get(key);
  }

  /**
   * Gets/sets whether or not this instance has been persisted somehow.
   *
   * @param  Boolean exists The exists value to set or `null` to get the current one.
   * @return mixed          Returns the exists value on get or `this` otherwise.
   */
  exists(exists) {
    if (arguments.length) {
      this._exists = exists;
      return this;
    }
    if (this._exists == null) {
      throw new Error("No persitance information is available for this entity use `sync()` to get an accurate existence value.");
    }
    return this._exists;
  }

  /**
   * Returns the current data and perform lazy loading when necessary
   *
   * @param  String name If name is defined, it'll only return the field value.
   * @return mixed.
   */
  fetch(name) {
    return co(function*() {
      var result = this.get(name, (instance, name) => {
        return this.schema().embed([instance], name);
      });
      if (result instanceof Promise) {
        yield result;
        return this._data[name] || null;
      }
      return result;
    }.bind(this));
  }

  /**
   * Automatically called after an entity is saved. Updates the object's internal state
   * to reflect the corresponding database record.
   *
   * @param mixed  id      The ID to assign, where applicable.
   * @param Object data    Any additional generated data assigned to the object by the database.
   * @param Object options Method options:
   *                      - `'exists'` _boolean_: Determines whether or not this entity exists
   *                        in data store.
   */
  amend(data, options) {
    data = data || {};
    options = options || {};
    this._exists = options.exists !== undefined ? options.exists : this._exists;

    var previousId = this.id();
    var schema = this.schema();

    for (var key in data) {
      if (options.rebuild || !this.has(key) || !schema.hasRelation(key, false)) {
        this.set(key, data[key]);
      } else {
        this.get(key).amend(data[key], options);
      }
    }
    super.amend();

    this._exists = this._exists === 'all' ? true : this._exists;

    if (!this.constructor.unicity()) {
      return this;
    }

    var id = this.id();
    if (previousId != null && previousId !== id) {
      this.constructor.shard().delete(previousId);
    }
    if (id != null) {
      if (this._exists) {
        this.constructor.shard().set(id, this);
      } else {
        this.constructor.shard().delete(id);
      }
    }
    return this;
  }

  /**
   * Creates and/or updates an entity and its relationship data in the datasource.
   *
   * For example, to create a new record or document:
   * {{{
   * var post = Post.create(); // Creates a new object, which doesn't exist in the database yet
   * post.set('title', 'My post');
   * var success = post.broadcast();
   * }}}
   *
   * It is also used to update existing database objects, as in the following:
   * {{{
   * var post = Post.first(id);
   * post.set('title', 'Revised title');
   * var success = post.broadcast();
   * }}}
   *
   * By default, an object's data will be checked against the validation rules of the model it is
   * bound to. Any validation errors that result can then be accessed through the `errors()`
   * method.
   *
   * {{{
   * if (!post.broadcast()) {
   *     return post.errors();
   * }
   * }}}
   *
   * To override the validation checks and save anyway, you can pass the `'validate'` option:
   *
   * {{{
   * post.set('title', 'We Don't Need No Stinkin' Validation');
   * post.set('body', 'I know what I'm doing.'');
   * post.broadcast({ validate: false });
   * }}}
   *
   * @param  Object  options Options:
   *                          - `'validate'`  _Boolean_ : If `false`, validation will be skipped, and the record will
   *                                                      be immediately saved. Defaults to `true`.
   * @return Promise
   */
  save(options) {
    return co(function*() {
      var defaults = {
        validate: true,
        embed: false
      };
      options = extend({}, defaults, options);
      if (options.validate) {
        var valid = yield this.validates(options);
        if (!valid) {
          return false;
        }
      }
      return yield this.schema().save(this, options);
    }.bind(this));
  }

  /**
   * Sync the entity existence from the database.
   *
   * @param  boolean data Indicate whether the data need to by synced or not.
   * @return Promise
   */
  sync(data) {
    return co(function* () {
      if (this._exists != null) {
        return;
      }
      var id = this.id();
      if (id != null) {
        var persisted = yield this.constructor.load(id);
        if (persisted && data) {
          this.amend(persisted.data(), { exists: true });
        } else {
          this._exists = !!persisted;
        }
      } else {
        this._exists = false;
      }
    }.bind(this));
  }

  /**
   * Deletes the data associated with the current `Model`.
   *
   * @return Promise Success.
   */
  delete() {
    var schema = this.schema();
    return schema.delete(this);
  }

  /**
   * Check if an entity is valid or not.
   *
   * @param  array   options Available options:
   *                         - `'events'` _mixed_    : A string or array defining one or more validation
   *                           events. Events are different contexts in which data events can occur, and
   *                           correspond to the optional `'on'` key in validation rules. For example, by
   *                           default, `'events'` is set to either `'create'` or `'update'`, depending on
   *                           whether the entity already exists. Then, individual rules can specify
   *                           `'on' => 'create'` or `'on' => 'update'` to only be applied at certain times.
   *                           You can also set up custom events in your rules as well, such as `'on' => 'login'`.
   *                           Note that when defining validation rules, the `'on'` key can also be an array of
   *                           multiple events.
   *                         - `'required'` _boolean_ : Sets the validation rules `'required'` default value.
   *                         - `'embed'`    _array_   : List of relations to validate.
   * @return Promise         Returns a promise.
   */
  validates(options) {
    return co(function* () {
      yield this.sync();
      var exists = this.exists();
      var defaults = {
        events: exists ? 'update' : 'create',
        required: exists ? false : true,
        entity: this,
        embed: true
      };
      options = extend({}, defaults, options);
      var validator = this.constructor.validator();
      var valid = yield this._validates(options);

      var success = yield validator.validates(this.get(), options);
      this._errors = {};
      this.invalidate(validator.errors());
      return success && valid;
    }.bind(this));
  }

  /**
   * Check if nested relations are valid
   *
   * @param  Object   options Available options:
   *                          - `'embed'` _Object_ : List of relations to validate.
   * @return Promise          The promise returns `true` if all validation rules succeed, `false` otherwise.
   */
  _validates(options) {
    return co(function* () {
      var defaults = { embed: true };
      options = extend({}, defaults, options);

      if (options.embed === true) {
        options.embed = this.hierarchy();
      }

      var schema = this.schema();
      var embed = schema.treeify(options.embed);
      var success = true;

      for (var name in embed) {
        if (this.has(name)) {
          var value = embed[name];
          var rel = schema.relation(name);
          var ok = yield rel.validates(this, extend({}, options, value));
          var success = success && ok;
        }
      }
      return success;
    }.bind(this));
  }

  /**
   * Invalidate a field or an array of fields.
   *
   * @param  String|Array field  The field to invalidate of an array of fields with associated errors.
   * @param  String|Array errors The associated error message(s).
   * @return self
   */
  invalidate(field, errors) {
    errors = errors || {};
    if (arguments.length === 1) {
      for (var name in field) {
        this.invalidate(name, field[name]);
      }
      return this;
    }
    if (errors) {
      var previous = this._errors[field];
      this._errors[field] = Array.isArray(errors) ? errors : [errors];
      if (this._errors[field] !== previous) {
        this.trigger('modified');
      }
    }
    return this;
  }

  /**
   * Return an indivitual error
   *
   * @param  String       field The field name.
   * @param  String|Array all   Indicate whether all errors or simply the first one need to be returned.
   * @return String             Return an array of error messages or the first one (depending on `all`) or
   *                            an empty string for no error.
   */
  error(field, all) {
    if (this._errors[field] && this._errors[field].length) {
      return all ? this._errors[field].splice() : this._errors[field][0];
    }
    return '';
  }

  /**
   * Returns the errors from the last `.validates()` call.
   *
   * @return Object The occured errors.
   */
  errors(options) {
    var defaults = { embed: true };
    options = extend({}, defaults, options);

    if (options.embed === true) {
      options.embed = this.hierarchy();
    }

    var schema = this.schema();
    var embed = schema.treeify(options.embed);
    var errors = extend({}, this._errors);

    for (var field in embed) {
      if (!this.has(field)) {
        continue;
      }
      var value = embed[field];
      var err = this.get(field).errors(extend({}, options, value));
      if (Object.keys(err).length) {
        errors[field] = err;
      }
    }
    return extend({}, errors);
  }

  /**
   * Check if the entity or a specific field errored
   *
   * @param  String  field The field to check.
   * @return Boolean
   */
  errored(field) {
    if (!arguments.length) {
      return !!Object.keys(this._errors).length;
    }
    return this._errors[field] !== undefined;
  }

  /**
   * Returns a string representation of the instance.
   *
   * @return String Returns the generated title of the object.
   */
  toString() {
    return String(this.title());
  }
}

/**
 * Class dependencies.
 *
 * @var Object
 */
Model._classes = {
  set: Collection,
  through: Through,
  conventions: Conventions,
  validator: Validator
};

/**
 * Stores validator instances.
 *
 * @var Object
 */
Model._validators = {};

/**
 * Stores model's schema.
 *
 * @var Map
 */
Model._definitions = new Map();

/**
 * Enable entities unicity
 *
 * @var Boolean
 */
Model._unicity = false;

/**
 * Source of truths when unicity is enabled.
 *
 * @var Map.
 */
Model._shards = new Map();

/**
 * Registered name.
 *
 * @var Object
 */
Model._name = undefined;

/**
 * Default query parameters for the model finders.
 *
 * @var Object
 */
Model._query = {};

/**
 * Naming conventions.
 *
 * @var Object A naming conventions.
 */
Model._conventions = undefined;

/**
 * Connection.
 *
 * @var Object The connection instance.
 */
Model._connection = undefined;

/**
 * Schema.
 *
 * @var Function
 */
Model._definition = undefined;

module.exports = Model;

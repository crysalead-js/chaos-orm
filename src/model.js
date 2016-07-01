import co from 'co';
import dotpath from 'dotpath-parser';
import { extend, merge } from "extend-merge";
import { expand, flatten } from "expand-flatten";
import { Validator } from "chaos-validator";
import Document from "./document";
import Conventions from "./conventions";
import Collector from "./collector";
import Collection from "./collection/collection";
import Through from "./collection/through";

class Model extends Document {

  /**
   * Registers a model dependency.
   *
   * @param  String   name  The dependency name.
   * @param  Function model The model to register.
   * @return Object         Returns `this`.
   */
  static register(name, model) {
    if (arguments.length === 2) {
      this._models[name] = model;
      return this;
    }
    this._name = name !== undefined ? name : this.name;
    this._models[this._name] = this;
    return this;
  }

  /**
   * Returns a registered model dependency.
   *
   * @param  String   name The field name.
   * @return Function       Returns `this`.
   */
  static registered(name) {
    if (!arguments.length) {
      return Object.keys(this._models);
    }
    if (this._models[name] === undefined) {
      throw new Error("Undefined `" + name + "` as model dependency, the model need to be registered first.");
    }
    return this._models[name];
  }

  /**
   * Gets/sets the connection object to which this model is bound.
   *
   * @param  Object $connection The connection instance to set or nothing to get the current one.
   * @return Object             Returns a connection instance.
   */
  static connection(connection) {
    if (arguments.length) {
      this._connection = connection;
      this._definitions.delete(this);
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
      this._validators[this.name] = validator;
      return;
    }

    if (this._validators[this.name]) {
      return this._validators[this.name];
    }
    var classname = this.classes().validator;
    var validator = this._validators[this.name] = new classname();
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
        this._definitions.set(this, schema);
      } else {
        this._definitions.delete(this);
      }
      return this;
    }
    if (this._definitions.has(this)) {
      return this._definitions.get(this);
    }

    var config = {
      classes: extend({}, this.classes(), { entity: this }),
      conventions: this.conventions(),
      connection: this._connection,
      model: this
    };

    config.source = this.conventions().apply('source', config.classes.entity.name);

    var schema = new this._definition(config);
    this._definitions.set(this, schema);
    this._define(schema);
    return schema;
  }

  /**
   * This function called once for initializing the model's schema.
   *
   * Example of schema initialization:
   * ```php
   * schema.set('id', { type: 'id' });
   *
   * schema.set('title', { type: 'string', 'default': true });
   *
   * schema.set('body', { type: 'string' });
   *
   * // Custom object
   * schema.set('comments',       { type: 'object', array: true, 'default': [] });
   * schema.set('comments.id',    { type: 'id' });
   * schema.set('comments.email', { type: 'string' });
   * schema.set('comments.body',  { type: 'string' });
   *
   * // Custom object with a dedicated class
   * schema.set('comments', {
   *    type: 'entity',
   *    model: Comment,
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
    this._definitions.delete(this);
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

    super(config);

    /**
     * Cached value indicating whether or not this instance exists somehow. If this instance has been loaded
     * from the database, or has been created and subsequently saved this value should be automatically
     * setted to `true`.
     *
     * @var Boolean
     */
    this.exists(config.exists);

    if (!this.exists()) {
      return;
    }
    var id = this.id();
    if (!id) {
      throw new Error("Existing entities must have a valid ID.");
    }
    var source = this.schema().source();
    this.uuid(source + ':' + id);
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
      throw new Error("No primary key has been defined for `" + this.model().name + "`'s schema.");
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
    return this._exists;
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
  sync(id, data, options) {
    data = data || {};
    options = options || {};
    if (options.exists !== undefined) {
      this._exists = options.exists;
    }
    var key = this.schema().key();
    if (id && key) {
      data[key] = id;
    }
    this.set(extend({}, this._data, data));
    this._persisted = extend({}, this._data);
    return this;
  }

  /**
   * Creates and/or updates an entity and its direct relationship data in the datasource.
   *
   * For example, to create a new record or document:
   * {{{
   * var post = Post.create(); // Creates a new object, which doesn't exist in the database yet
   * post.set('title', 'My post');
   * var success = post.save();
   * }}}
   *
   * It is also used to update existing database objects, as in the following:
   * {{{
   * var post = Post.first(id);
   * post.set('title', 'Revised title');
   * var success = post.save();
   * }}}
   *
   * By default, an object's data will be checked against the validation rules of the model it is
   * bound to. Any validation errors that result can then be accessed through the `errors()`
   * method.
   *
   * {{{
   * if (!post.save()) {
   *     return post.errors();
   * }
   * }}}
   *
   * To override the validation checks and save anyway, you can pass the `'validate'` option:
   *
   * {{{
   * post.set('title', 'We Don't Need No Stinkin' Validation');
   * post.set('body', 'I know what I'm doing.'');
   * post.save({ validate: false });
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
        validate: true
      };
      options = extend({}, defaults, options);
      if (options.validate) {
        var valid = yield this.validate(options);
        if (!valid) {
          return false;
        }
      }
      return yield this.schema().save(this, options);
    }.bind(this));
  }

  /**
   * Similar to `.save()` except the direct relationship has not been saved by default.
   *
   * @param  Object  options Same options as `.save()`.
   * @return Promise
   */
  persist(options) {
    return this.save(extend({}, { embed: false }, options));
  }

  /**
   * Reloads the entity from the datasource.
   *
   * @return Promise
   */
  reload() {
    var id = this.id();
    return this.model().load(id).then(function(entity) {
      if (!entity) {
        throw new Error("The entity ID:`" + id + "` doesn't exists.");
      }
      this._exists = true;
      this.set(entity.get());
      this._persisted = extend({}, this._data);
    }.bind(this));
  }

  /**
   * Removes the data associated with the current `Model`.
   *
   * @param  Object  options Options.
   * @return Promise
   */
  delete(options) {
    var schema = this.schema();
    var key = schema.key();
    if (!key || this.exists() === false) {
      return false;
    }
    var params = {};
    params[key] = this.id();
    return schema.truncate(params).then(function() {
      this._exists = false;
      this._persisted = {};
    }.bind(this));
  }

  /**
   * Validates the entity data.
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
  validate(options) {
    return co(function* () {
      var defaults = {
        events: this.exists() !== false ? 'update' : 'create',
        required: this.exists() !== false ? false : true,
        embed: true
      };
      options = extend({}, defaults, options);
      var validator = this.model().validator();

      var valid = yield this._validate(options);

      var success = yield validator.validate(this.get(), options);
      this._errors = validator.errors();
      return success && valid;
    }.bind(this));
  }

  /**
   * Validates a relation.
   *
   * @param  array   $options Available options:
   *                          - `'embed'` _array_ : List of relations to validate.
   * @return boolean          Returns `true` if all validation rules on all fields succeed, otherwise `false`.
   */
  _validate(options) {
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
          var ok = yield rel.validate(this, extend({}, options, { embed: value }));
          var success = success && ok;
        }
      }
      return success;
    }.bind(this));
  }

  /**
   * Returns the errors from the last `.validate()` call.
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

    for (var name in embed) {
      if (this.has(name)) {
        var value = embed[name];
        errors[name] = this.get(name).errors(extend({}, options, { embed: value }));
      }
    }
    return errors;
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
  collector: Collector,
  set: Collection,
  through: Through,
  conventions: Conventions,
  validator: Validator
};

/**
 * Registered name.
 *
 * @var Object
 */
Model._name = undefined;

/**
 * Stores validator instances.
 *
 * @var Object
 */
Model._validators = {};

/**
 * Registered models
 */
Model._models = {};

/**
 * Default query parameters for the model finders.
 *
 * @var Object
 */
Model._query = {};

/**
 * Stores model's schema.
 *
 * @var Object
 */
Model._definitions = new Map();

/**
 * MUST BE re-defined in sub-classes which require some different conventions.
 *
 * @var Object A naming conventions.
 */
Model._conventions = undefined;

/**
 * MUST BE re-defined in sub-classes which require a different connection.
 *
 * @var Object The connection instance.
 */
Model._connection = undefined;

/**
 * MUST BE re-defined in sub-classes which require a different schema.
 *
 * @var Function
 */
Document._definition = undefined;

export default Model;

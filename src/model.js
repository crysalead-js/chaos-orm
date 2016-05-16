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

class Model extends Document{

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
    var name = name !== undefined ? name : this.name;
    this._models[name] = this;
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
   * Configures the Model.
   *
   * @param Object config Possible options are:
   *                      - `'schema'`      _Object_: The schema instance to use.
   *                      - `'validator'`   _Object_: The validator instance to use.
   *                      - `'connection'`  _Object_: The connection instance to use.
   *                      - `'conventions'` _Object_: The conventions instance to use.
   */
  static config(config) {
    config = config || {};
    this.classes(config.classes);
    this.conventions(config.conventions);
    this.connection(config.connection);
    this.schema(config.schema);
    this.validator(config.validator);
    this.query(config.query);
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
      delete this._schemas[this.name];
      return this;
    }
    return this._connection;
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
    return this.schema().query({ query: options });
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
    options.conditions[this.schema().key()] = id;
    return this.first(options, fetchOptions);
  }

  /**
   * Gets/sets the schema instance.
   *
   * @param  Object schema The schema instance to set or none to get it.
   * @return Object        The schema instance.
   */
  static schema(schema) {
    if (arguments.length) {
      if (typeof schema === 'function') {
        this._schema = schema;
      } else {
        this._schemas[this.name] = schema;
      }
      return this;
    }
    if (this._schemas[this.name] !== undefined) {
      return this._schemas[this.name];
    }

    var config = {
      classes: extend({}, this.classes(), { entity: this }),
      connection: this._connection,
      conventions: this.conventions(),
      model: this
    };
    config.source = this.conventions().apply('source', config.classes.entity.name);

    schema = this._schemas[this.name] = new this._schema(config);
    this._define(schema);
    return schema;
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
   * Resets the Model.
   */
  static reset() {
    this.config();
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
   *                      - `'collector'`  _object_ : A collector instance.
   *                      - `'parent'`     _object_ : The parent instance.
   *                      - `'rootPath'`   _string_ : A dotted field names path (for embedded entities).
   *                      - `'exists'`     _boolean_: A boolean or `null` indicating if the entity exists.
   *                      - `'data'`       _array_  : The entity's data.
   *
   */
  constructor(config) {
    super(config);
    var defaults = {
      rootPath: undefined
    };
    config = extend({}, defaults, config);

    if (!this._collector) {
      return;
    }

    var id = this.id();
    if (!id) {
      return;
    }

    var schema = this.model().schema();
    var source = schema.source();

    if (!this._collector.exists(source, id)) {
      this._collector.set(source, id, this);
    }
  }

  /**
   * Returns the primary key value.
   *
   * @return mixed     The primary key value.
   */
  id() {
    var key = this.model().schema().key();
    if (!key) {
      throw new Error("No primary key has been defined for `" + this.model().name + "`'s schema.");
    }
    return this.get(key);
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
    var key = this.model().schema().key();
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
   *                          - `'validate'`  _Boolean_       : If `false`, validation will be skipped, and the record will
   *                                                            be immediately saved. Defaults to `true`.
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
      return yield this.model().schema().save(this, options);
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
    var schema = this.model().schema();
    var key = schema.key();
    if (!key || this.exists() === false) {
      return false;
    }
    var params = {};
    params[key] = this.id();
    return schema.delete(params).then(function() {
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

      var schema = this.model().schema();
      var embed = schema.treeify(options.embed);
      var success = true;

      for (var name in embed) {
        var value = embed[name];
        var rel = schema.relation(name);
        var ok = yield rel.validate(this, extend({}, options, { embed: value }));
        var success = success && ok;
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
    var schema = this.model().schema();
    var embed = schema.treeify(options.embed);
    var errors = extend({}, this._errors);

    for (var name in embed) {
      var value = embed[name];
      var relation = schema.relation(name);
      var fieldname = relation.name();
      if (this._data[fieldname]) {
        errors[fieldname] = this._data[fieldname].errors(extend({}, options, { embed: value }));
      }
    }
    return errors;
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
 * Registered models
 */
Model._models = {};

/**
 * Stores model's schema.
 *
 * @var Object
 */
Model._schemas = {};

/**
 * Stores validator instances.
 *
 * @var Object
 */
Model._validators = {};

/**
 * Default query parameters for the model finders.
 *
 * @var Object
 */
Model._query = {};

/**
 * MUST BE re-defined in sub-classes which require a different connection.
 *
 * @var Object The connection instance.
 */
Model._connection = undefined;

/**
 * MUST BE re-defined in sub-classes which require some different conventions.
 *
 * @var Object A naming conventions.
 */
Model._conventions = undefined;

/**
 * MUST BE re-defined in sub-classes which require a different schema.
 *
 * @var Function
 */
Model._schema = undefined;

export default Model;
